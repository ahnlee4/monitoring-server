GROUP_OPERATION_ADDRESS = 0x0050
GROUP_OPERATION_LOW_BYTES = {
    "run": 0x01,
    "stop": 0x00,
}
MAX_COMPRESSORS = 12
RUN_SEQUENCE_KEYS = (
    "0028",
    "002A",
    "002C",
    "002E",
    "0030",
    "0032",
    "0034",
    "0036",
    "0038",
    "000E",
    "0010",
    "0012",
)


def build_group_operation_value(current_value: int, action: str) -> int:
    try:
        low_byte = GROUP_OPERATION_LOW_BYTES[action]
    except KeyError as exc:
        raise ValueError(f"unsupported group operation action: {action}") from exc
    return (int(current_value) & 0xFF00) | low_byte


def build_group_operation_payload(current_value: int, action: str) -> list[int]:
    value = build_group_operation_value(current_value, action)
    return [
        0xC9,
        0x20,
        (GROUP_OPERATION_ADDRESS >> 8) & 0xFF,
        GROUP_OPERATION_ADDRESS & 0xFF,
        0x00,
        0x02,
        (value >> 8) & 0xFF,
        value & 0xFF,
    ]


def normalize_run_sequence(sequence: list[int], available_units: list[int]) -> list[int]:
    normalized: list[int] = []
    for unit in [*sequence, *available_units]:
        if not 1 <= int(unit) <= MAX_COMPRESSORS or unit in normalized:
            continue
        normalized.append(int(unit))
    return normalized


def build_equipment_operation_write(
    unit: int,
    oilfree_selector: int,
    running: bool,
    delay_after_seconds: float,
) -> dict:
    low_address = 0x44 if oilfree_selector & (1 << (unit - 1)) else 0x1A
    return {
        "key": f"{0x10 + unit:02X}{low_address:02X}",
        "address": ((0x10 + unit) << 8) | low_address,
        "length": 2,
        "value": 0x0002 if running else 0x0001,
        "delay_after_seconds": max(0.0, float(delay_after_seconds)),
    }


def build_group_operation_writes(
    current_value: int,
    action: str,
    sequence: list[int],
    available_units: list[int],
    run_units: int,
    oilfree_selector: int,
    repair_mask: int,
    running_units: list[int],
    run_delay_seconds: float,
    stop_delay_seconds: float,
) -> list[dict]:
    ordered = normalize_run_sequence(sequence, available_units)
    usable = [unit for unit in ordered if not repair_mask & (1 << (unit - 1))]
    target_units = usable[: max(0, min(int(run_units), len(usable)))]
    group_write = {
        "key": "0050",
        "address": GROUP_OPERATION_ADDRESS,
        "length": 2,
        "value": build_group_operation_value(current_value, action),
    }

    if action == "run":
        return [
            group_write,
            *[
                build_equipment_operation_write(unit, oilfree_selector, True, run_delay_seconds)
                for unit in target_units
            ],
        ]
    if action != "stop":
        raise ValueError(f"unsupported group operation action: {action}")

    running_set = set(running_units)
    stop_units = [unit for unit in ordered if unit in running_set]
    for unit in running_units:
        if unit not in stop_units and 1 <= unit <= MAX_COMPRESSORS:
            stop_units.append(unit)
    if not stop_units:
        stop_units = target_units
    return [
        *[
            build_equipment_operation_write(unit, oilfree_selector, False, stop_delay_seconds)
            for unit in reversed(stop_units)
        ],
        group_write,
    ]
