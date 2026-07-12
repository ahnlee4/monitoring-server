GROUP_OPERATION_ADDRESS = 0x0050
GROUP_OPERATION_LOW_BYTES = {
    "run": 0x01,
    "stop": 0x00,
}


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
