GROUP_OPERATION_PREFIX = (0xC9, 0x60, 0x50, 0x00)
GROUP_OPERATION_VALUES = {
    "run": 0x01,
    "stop": 0x02,
}


def build_group_operation_payload(action: str) -> list[int]:
    try:
        value = GROUP_OPERATION_VALUES[action]
    except KeyError as exc:
        raise ValueError(f"unsupported group operation action: {action}") from exc
    return [*GROUP_OPERATION_PREFIX, value]
