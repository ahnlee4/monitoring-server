from __future__ import annotations

import time
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Iterable
import re
import threading

import serial

from app.base import BaseCollector
from app.models import AlarmEvent, CollectorBatch, ControlCommand, MapValueUpdate, Metric, TelemetryFrame


FRAME_START = 0x65
FRAME_MASTER_ID = 0xC9
CMD_MAP_WRITE = 0x20
CMD_FULL_READ = 0x13
CMD_CHANGED_DATA = 0x15
MEM_ADDR_COMP1 = 0x11
MEM_ADDR_COMP8 = 0x18
CRC_POLY = 0xA001
SYSTEM_OILFREE_SELECTOR_OFFSET = 0x06
INJECTION_SIGNED_OFFSETS = {0x00, 0x02, 0x04, 0x06, 0x08}
OILFREE_SIGNED_OFFSETS = set(range(0x00, 0x28, 2))


@dataclass(frozen=True)
class CompField:
    name: str
    signed: bool = False
    scale: float = 1.0
    unit: str = ""

    @property
    def metric_key(self) -> str:
        key = self.name[1:] if self.name.startswith("m") and len(self.name) > 1 else self.name
        return "_".join(_to_snake_case(part) for part in key.split("_") if part)


COMP_FIELDS: tuple[CompField, ...] = (
    CompField("SERVICE_PRESSURE", signed=True, scale=0.1, unit="bar"),
    CompField("P2", signed=True, scale=0.1, unit="bar"),
    CompField("P3", signed=True, scale=0.1, unit="bar"),
    CompField("P4", signed=True, scale=0.1, unit="bar"),
    CompField("P5", signed=True, scale=0.1, unit="bar"),
    CompField("P6", signed=True, scale=0.1, unit="bar"),
    CompField("T1", signed=True, scale=0.1, unit="degC"),
    CompField("T2", signed=True, scale=0.1, unit="degC"),
    CompField("T3", signed=True, scale=0.1, unit="degC"),
    CompField("T4", signed=True, scale=0.1, unit="degC"),
    CompField("T5", signed=True, scale=0.1, unit="degC"),
    CompField("T6", signed=True, scale=0.1, unit="degC"),
    CompField("T7", signed=True, scale=0.1, unit="degC"),
    CompField("T8", signed=True, scale=0.1, unit="degC"),
    CompField("T9", signed=True, scale=0.1, unit="degC"),
    CompField("T10", signed=True, scale=0.1, unit="degC"),
    CompField("T11", signed=True, scale=0.1, unit="degC"),
    CompField("T12", signed=True, scale=0.1, unit="degC"),
    CompField("T13", signed=True, scale=0.1, unit="degC"),
    CompField("T14", signed=True, scale=0.1, unit="degC"),
    CompField("mALARM_FLAG"),
    CompField("mFAULT_FLG_L"),
    CompField("mFAULT_FLG_H"),
    CompField("mFAULT_INV"),
    CompField("mCP_STATUS"),
    CompField("mOUTPUT_STATUS"),
    CompField("mINPUT_STATUS"),
    CompField("mCOUNT_STATUS"),
    CompField("mINV_RPM", unit="rpm"),
    CompField("mRUN_MODE"),
    CompField("mREAL_YEARWEEK"),
    CompField("mREAL_MONTHDAY"),
    CompField("mREAL_HOURMIN"),
    CompField("mREAL_SEC"),
    CompField("mEXT_RUN_STOP"),
    CompField("mINV_TargetP", scale=0.1, unit="bar"),
    CompField("mINV_InDirectP", scale=0.1, unit="bar"),
    CompField("mINV_DirectP", scale=0.1, unit="bar"),
    CompField("mEMER_STOP_P", scale=0.1, unit="bar"),
    CompField("mUNLOAD_P", scale=0.1, unit="bar"),
    CompField("mLOAD_P", scale=0.1, unit="bar"),
    CompField("mAUTO_STOP_MIN", unit="min"),
    CompField("mOIL_START_SEC", unit="sec"),
    CompField("mYD_CONVERSION_SEC", unit="sec"),
    CompField("mSYSTEM_ID"),
    CompField("mDRIVE_SET_MODE"),
    CompField("mMANUAL_UNLOAD_MODE"),
    CompField("mREMOTE_TYPE"),
    CompField("mTOUT1_FAULT_TEMP", scale=0.1, unit="degC"),
    CompField("mTOUT2_FAULT_TEMP", scale=0.1, unit="degC"),
    CompField("mTOIL_FAULT_TEMP", scale=0.1, unit="degC"),
    CompField("mPMAX_LIMIT", scale=0.1, unit="bar"),
    CompField("mP2IN_FAULT", scale=0.1, unit="bar"),
    CompField("mPOIL_FAULT", scale=0.1, unit="bar"),
    CompField("mPAIRFILTER_DEF_ALARM", signed=True, scale=0.1, unit="bar"),
    CompField("mLOAD_DELAY_SEC", unit="sec"),
    CompField("mSTOP_DELAY_SEC", unit="sec"),
    CompField("mAIRFILTER_USE_LIMIT", unit="hour"),
    CompField("mOILFILTER_USE_LIMIT", unit="hour"),
    CompField("mOIL_USE_LIMIT", unit="hour"),
    CompField("mGRESS_USE_LIMIT", unit="hour"),
    CompField("mLOAD_TEMP", signed=True, scale=0.1, unit="degC"),
    CompField("mMODEL_1"),
    CompField("mVERSION_1"),
    CompField("mVERSION_2"),
    CompField("mVERSION_NUM"),
    CompField("mINV_FREQ", scale=0.1, unit="Hz"),
    CompField("mINV_MAX_RPM", unit="rpm"),
    CompField("mINV_MIN_RPM", unit="rpm"),
    CompField("mTOTAL_AIR_FILT_TIME", unit="hour"),
    CompField("mTOTAL_OIL_FILT_TIME", unit="hour"),
    CompField("mTOTAL_OIL_TIME", unit="hour"),
    CompField("mTOTAL_GRESS_TIME", unit="hour"),
    CompField("mTOTAL_UNLOAD_TIME", unit="hour"),
    CompField("mTOTAL_LOAD_TIME", unit="hour"),
    CompField("mTOTAL_AUTOSTOP_TIME", unit="hour"),
    CompField("mTOTAL_STOP_TIME", unit="hour"),
    CompField("mTOTAL_RUN_TIME_L", unit="hour"),
    CompField("mTOTAL_RUN_TIME_H", unit="hour"),
    CompField("mTOTAL_RUN_COUNT_L", unit="count"),
    CompField("mTOTAL_RUN_COUNT_H", unit="count"),
    CompField("mSERIAL_YEAR"),
    CompField("mEXT_SERVICE_P", scale=0.1, unit="bar"),
)


class Uart4ProtocolError(RuntimeError):
    pass


class RS485Collector(BaseCollector):
    def __init__(
        self,
        serial_port: str,
        baudrate: int,
        comp_qty: int = 8,
        response_timeout: float = 0.8,
        inter_request_delay: float = 0.05,
        write_request_delay: float = 0.05,
        write_response_timeout: float = 0.25,
        debug_hex: bool = False,
    ) -> None:
        self.serial_port = serial_port
        self.baudrate = baudrate
        self.comp_qty = max(1, min(comp_qty, 8))
        self.response_timeout = response_timeout
        self.inter_request_delay = inter_request_delay
        self.write_request_delay = write_request_delay
        self.write_response_timeout = write_response_timeout
        self.debug_hex = debug_hex
        self._serial: serial.Serial | None = None
        self._serial_lock = threading.RLock()
        self._control_priority = threading.Event()
        self._word_cache: dict[int, list[int]] = {}
        self._is_injection = [True] * self.comp_qty

    def request_control_priority(self) -> None:
        self._control_priority.set()

    def release_control_priority(self) -> None:
        self._control_priority.clear()

    def poll(self) -> CollectorBatch:
        recorded_at = datetime.now(timezone.utc).isoformat()
        frames: list[TelemetryFrame] = []
        map_values: list[MapValueUpdate] = []

        try:
            if self._control_priority.is_set():
                return CollectorBatch(source="collector-uart4", recorded_at=recorded_at, frames=frames, map_values=map_values)
            port = self._open_serial()
            system_words = self._poll_address(port, 0x00)
            if system_words is not None:
                self._word_cache[0x00] = system_words
                self._update_equipment_types(system_words)
                map_values.extend(words_to_generic_map_values(0x00, system_words))
                time.sleep(self.inter_request_delay)
            else:
                return CollectorBatch(
                    source="collector-uart4",
                    recorded_at=recorded_at,
                    frames=frames,
                    map_values=map_values,
                )

            for comp_index in range(self.comp_qty):
                if self._control_priority.is_set():
                    break
                mem_addr = MEM_ADDR_COMP1 + comp_index
                words = self._poll_address(port, mem_addr)
                if words is None:
                    continue
                self._word_cache[mem_addr] = words
                frames.append(self._to_frame(comp_index, words, recorded_at))
                map_values.extend(words_to_map_values(comp_index, words, self._is_injection[comp_index]))
                time.sleep(self.inter_request_delay)
        except Exception as exc:
            self._close_serial()
            print(f"collector-rs485 error on {self.serial_port}: {exc}")

        return CollectorBatch(
            source="collector-uart4",
            recorded_at=recorded_at,
            frames=frames,
            map_values=map_values,
        )

    def _open_serial(self) -> serial.Serial:
        with self._serial_lock:
            if self._serial and self._serial.is_open:
                return self._serial

            self._serial = serial.Serial(
                port=self.serial_port,
                baudrate=self.baudrate,
                bytesize=serial.EIGHTBITS,
                parity=serial.PARITY_NONE,
                stopbits=serial.STOPBITS_ONE,
                timeout=self.response_timeout,
                write_timeout=self.response_timeout,
            )
            print(f"collector-uart4 opened {self.serial_port} @ {self.baudrate} 8N1")
            return self._serial

    def _close_serial(self) -> None:
        with self._serial_lock:
            if self._serial:
                try:
                    self._serial.close()
                finally:
                    self._serial = None

    def _update_equipment_types(self, system_words: list[int]) -> None:
        selector_index = SYSTEM_OILFREE_SELECTOR_OFFSET // 2
        if selector_index >= len(system_words):
            return

        oilfree_selector = int(system_words[selector_index])
        for index in range(self.comp_qty):
            self._is_injection[index] = not bool(oilfree_selector & (1 << index))

    def _poll_address(self, port: serial.Serial, mem_addr: int) -> list[int] | None:
        with self._serial_lock:
            request = build_full_read_request(mem_addr)
            port.reset_input_buffer()
            port.write(request)
            port.flush()
            self._debug("tx", request)

            try:
                frame = self._read_frame(port)
            except Uart4ProtocolError as exc:
                print(f"collector-uart4 addr 0x{mem_addr:02X} no valid response: {exc}")
                return None

        self._debug("rx", frame)
        command = frame[1]
        if command == CMD_FULL_READ:
            response_mem_addr, start_offset, words = decode_full_read_response(frame)
            if response_mem_addr != mem_addr:
                raise Uart4ProtocolError(
                    f"response address 0x{response_mem_addr:02X} did not match request 0x{mem_addr:02X}"
                )
            return merge_words([], start_offset, words)

        if command == CMD_CHANGED_DATA:
            existing = self._word_cache.get(mem_addr, [])
            updates = decode_changed_data_response(frame)
            return apply_word_updates(existing, updates)

        raise Uart4ProtocolError(f"unsupported command 0x{command:02X}")

    def execute_control_command(self, command: ControlCommand) -> None:
        if command.command_type == "raw_uart4":
            self._execute_raw_uart4_command(command)
            return
        if command.command_type != "map_write_batch":
            raise ValueError(f"unsupported control command: {command.command_type}")

        writes = command.payload.get("writes", [])
        if not isinstance(writes, list) or not writes:
            raise ValueError("control command has no writes")

        port = self._open_serial()
        for write in writes:
            address = int(write["address"])
            length = int(write.get("length", 2))
            data = bytes_from_hex(str(write["data_hex"])) if "data_hex" in write else None
            value = int(write.get("value", 0))
            request = build_map_write_request(address, value, length, data)
            with self._serial_lock:
                port.reset_input_buffer()
                port.write(request)
                port.flush()
                self._debug("tx-control", request)
                self._read_control_response(port, address)
            time.sleep(self.write_request_delay)

    def _execute_raw_uart4_command(self, command: ControlCommand) -> None:
        payload = command.payload
        request = bytes_from_hex(str(payload["payload_hex"]))
        if bool(payload.get("append_crc", True)):
            request = append_crc(request)
        port = self._open_serial()
        with self._serial_lock:
            port.reset_input_buffer()
            port.write(request)
            port.flush()
            self._debug("tx-raw", request)
            if bool(payload.get("wait_response", False)):
                try:
                    frame = self._read_frame(port, self.write_response_timeout)
                    self._debug("rx-raw", frame)
                except Uart4ProtocolError as exc:
                    print(f"collector-uart4 raw command no immediate response: {exc}")
        time.sleep(self.write_request_delay)

    def _read_control_response(self, port: serial.Serial, address: int) -> None:
        if self.write_response_timeout <= 0:
            return
        try:
            frame = self._read_frame(port, self.write_response_timeout)
        except Uart4ProtocolError as exc:
            print(f"collector-uart4 write addr 0x{address:04X} no immediate response: {exc}")
            return

        self._debug("rx-control", frame)
        try:
            self._apply_response_frame(frame, expected_mem_addr=(address >> 8) & 0xFF)
        except Uart4ProtocolError as exc:
            print(f"collector-uart4 write addr 0x{address:04X} response ignored: {exc}")

    def _apply_response_frame(self, frame: bytes, expected_mem_addr: int | None = None) -> list[int]:
        command = frame[1]
        if command == CMD_FULL_READ:
            response_mem_addr, start_offset, words = decode_full_read_response(frame)
            if expected_mem_addr is not None and response_mem_addr != expected_mem_addr:
                raise Uart4ProtocolError(
                    f"response address 0x{response_mem_addr:02X} did not match expected 0x{expected_mem_addr:02X}"
                )
            merged = merge_words([], start_offset, words)
            self._word_cache[response_mem_addr] = merged
            return merged

        if command == CMD_CHANGED_DATA:
            updates = decode_changed_data_response(frame)
            if expected_mem_addr is None:
                raise Uart4ProtocolError("changed-data response needs an expected address")
            existing = self._word_cache.get(expected_mem_addr, [])
            merged = apply_word_updates(existing, updates)
            self._word_cache[expected_mem_addr] = merged
            return merged

        raise Uart4ProtocolError(f"unsupported command 0x{command:02X}")

    def _read_frame(self, port: serial.Serial, timeout: float | None = None) -> bytes:
        effective_timeout = self.response_timeout if timeout is None else timeout
        deadline = time.monotonic() + effective_timeout
        previous_timeout = port.timeout
        if timeout is not None:
            port.timeout = timeout

        try:
            while time.monotonic() < deadline:
                first = port.read(1)
                if not first:
                    continue
                if first[0] != FRAME_START:
                    continue

                command_raw = port.read(1)
                if len(command_raw) != 1:
                    break
                command = command_raw[0]

                if command == CMD_FULL_READ:
                    header_rest = read_exact(port, 4)
                    byte_count = (header_rest[2] << 8) | header_rest[3]
                    payload_crc = read_exact(port, byte_count + 2)
                    frame = first + command_raw + header_rest + payload_crc
                elif command == CMD_CHANGED_DATA:
                    len_bytes = read_exact(port, 2)
                    byte_count = (len_bytes[0] << 8) | len_bytes[1]
                    payload_crc = read_exact(port, byte_count + 2)
                    frame = first + command_raw + len_bytes + payload_crc
                else:
                    continue

                validate_crc(frame)
                return frame
        finally:
            if timeout is not None:
                port.timeout = previous_timeout

        raise Uart4ProtocolError("timeout waiting for UART4 frame")

    def _to_frame(self, comp_index: int, words: list[int], recorded_at: str) -> TelemetryFrame:
        values = decode_comp_words(words)
        fault_values = {
            "alarm_flag": int(values.get("alarm_flag", 0)),
            "fault_flg_l": int(values.get("fault_flg_l", 0)),
            "fault_flg_h": int(values.get("fault_flg_h", 0)),
            "fault_inv": int(values.get("fault_inv", 0)),
        }
        has_fault = any(value != 0 for value in fault_values.values())
        run_mode = int(values.get("run_mode", 0))
        cp_status = int(values.get("cp_status", 0))

        status = "alarm" if has_fault else "running" if run_mode or cp_status else "idle"
        alarms = [
            AlarmEvent(level="warning", message=f"{key}=0x{value:04X}", active=True)
            for key, value in fault_values.items()
            if value
        ]

        metrics = [
            Metric(key=key, value=value, unit=unit)
            for key, value, unit in values_to_metrics(values)
        ]
        metrics.append(Metric(key="link_status", value="online", unit=""))

        device_no = comp_index + 1
        return TelemetryFrame(
            device_code=f"COMP-{device_no:02d}",
            device_name=f"Compressor {device_no}",
            location="UART4 RS485",
            status=status,
            source="collector-uart4",
            recorded_at=recorded_at,
            metrics=metrics,
            alarms=alarms,
        )

    def _debug(self, label: str, data: bytes) -> None:
        if self.debug_hex:
            print(f"collector-uart4 {label}: {data.hex(' ').upper()}")


def build_full_read_request(mem_addr: int) -> bytes:
    if not 0 <= mem_addr <= 0xFF:
        raise ValueError(f"unsupported GLINK memory address: 0x{mem_addr:X}")

    payload = bytes([FRAME_MASTER_ID, CMD_FULL_READ, mem_addr, 0x00, 0x00, 0x00])
    return append_crc(payload)


def build_map_write_request(address: int, value: int = 0, length: int = 2, data: bytes | None = None) -> bytes:
    if not 0 <= address <= 0xFFFF:
        raise ValueError(f"unsupported map write address: 0x{address:X}")
    if not 1 <= length <= 0xFFFF:
        raise ValueError(f"unsupported map write length: {length}")

    payload_data = data if data is not None else int(value).to_bytes(length, byteorder="big", signed=False)
    if len(payload_data) != length:
        raise ValueError(f"map write data length {len(payload_data)} did not match declared length {length}")
    payload = bytes(
        [
            FRAME_MASTER_ID,
            CMD_MAP_WRITE,
            (address >> 8) & 0xFF,
            address & 0xFF,
            (length >> 8) & 0xFF,
            length & 0xFF,
        ]
    ) + payload_data
    return append_crc(payload)


def bytes_from_hex(value: str) -> bytes:
    compact = re.sub(r"[^0-9A-Fa-f]", "", value)
    if len(compact) % 2:
        raise ValueError(f"hex data must have an even number of digits: {value}")
    return bytes.fromhex(compact)


def decode_full_read_response(frame: bytes) -> tuple[int, int, list[int]]:
    if len(frame) < 8 or frame[0] != FRAME_START or frame[1] != CMD_FULL_READ:
        raise Uart4ProtocolError("not a UART4 full-read response")

    validate_crc(frame)
    mem_addr = frame[2]
    start_offset = frame[3]
    byte_count = (frame[4] << 8) | frame[5]
    data = frame[6 : 6 + byte_count]
    if len(data) != byte_count or byte_count % 2:
        raise Uart4ProtocolError(f"invalid full-read byte count: {byte_count}")

    return mem_addr, start_offset, words_from_bytes(data)


def decode_changed_data_response(frame: bytes) -> list[tuple[int, int]]:
    if len(frame) < 10 or frame[0] != FRAME_START or frame[1] != CMD_CHANGED_DATA:
        raise Uart4ProtocolError("not a UART4 changed-data response")

    validate_crc(frame)
    byte_count = (frame[2] << 8) | frame[3]
    data = frame[4 : 4 + byte_count]
    if len(data) != byte_count or byte_count % 4:
        raise Uart4ProtocolError(f"invalid changed-data byte count: {byte_count}")

    updates: list[tuple[int, int]] = []
    for index in range(0, len(data), 4):
        offset = data[index + 1]
        value = (data[index + 2] << 8) | data[index + 3]
        updates.append((offset, value))
    return updates


def merge_words(existing: list[int], start_offset: int, words: Iterable[int]) -> list[int]:
    merged = list(existing)
    return apply_word_updates(merged, [(start_offset + index * 2, word) for index, word in enumerate(words)])


def apply_word_updates(existing: list[int], updates: Iterable[tuple[int, int]]) -> list[int]:
    merged = list(existing)
    for offset, word in updates:
        word_index = offset // 2
        if word_index >= len(merged):
            merged.extend([0] * (word_index + 1 - len(merged)))
        merged[word_index] = word & 0xFFFF
    return merged


def decode_comp_words(words: list[int]) -> dict[str, float | int]:
    values: dict[str, float | int] = {}
    for index, field in enumerate(COMP_FIELDS):
        if index >= len(words):
            break
        raw_value = signed_16(words[index]) if field.signed else words[index]
        value: float | int = raw_value * field.scale
        if field.scale == 1.0:
            value = int(raw_value)
        else:
            value = round(value, 3)
        values[field.metric_key] = value
    return values


def values_to_metrics(values: dict[str, float | int]) -> Iterable[tuple[str, float | int, str]]:
    unit_by_key = {field.metric_key: field.unit for field in COMP_FIELDS}
    for key, value in values.items():
        yield key, value, unit_by_key.get(key, "")


def words_to_map_values(comp_index: int, words: list[int], is_injection: bool) -> list[MapValueUpdate]:
    comp_no = comp_index + 1
    prefix = f"{1 if is_injection else 2}{comp_no:X}"
    signed_offsets = INJECTION_SIGNED_OFFSETS if is_injection else OILFREE_SIGNED_OFFSETS
    updates: list[MapValueUpdate] = []

    for word_index, word in enumerate(words):
        offset = word_index * 2
        if offset > 0xA4:
            break
        value = signed_16(word) if offset in signed_offsets else word
        updates.append(MapValueUpdate(key=f"{prefix}{offset:02X}", value=value))

    return updates


def words_to_generic_map_values(high_addr: int, words: list[int]) -> list[MapValueUpdate]:
    prefix = f"{high_addr:02X}"
    return [
        MapValueUpdate(key=f"{prefix}{word_index * 2:02X}", value=word)
        for word_index, word in enumerate(words)
    ]


def words_from_bytes(data: bytes) -> list[int]:
    return [(data[index] << 8) | data[index + 1] for index in range(0, len(data), 2)]


def signed_16(value: int) -> int:
    value &= 0xFFFF
    return value - 0x10000 if value & 0x8000 else value


def append_crc(payload: bytes) -> bytes:
    crc = crc16(payload)
    return payload + bytes([(crc >> 8) & 0xFF, crc & 0xFF])


def validate_crc(frame: bytes) -> None:
    if len(frame) < 4:
        raise Uart4ProtocolError("frame too short for CRC")
    expected = crc16(frame[:-2])
    received = (frame[-2] << 8) | frame[-1]
    if expected != received:
        raise Uart4ProtocolError(f"CRC mismatch expected 0x{expected:04X}, got 0x{received:04X}")


def crc16(data: bytes) -> int:
    crc = 0xFFFF
    if not data:
        return (~crc) & 0xFFFF

    for byte in data:
        value = byte & 0xFF
        for _ in range(8):
            if (crc & 0x0001) ^ (value & 0x0001):
                crc = (crc >> 1) ^ CRC_POLY
            else:
                crc >>= 1
            value >>= 1

    data_crc = crc & 0xFFFF
    return ((data_crc << 8) | ((data_crc >> 8) & 0xFF)) & 0xFFFF


def read_exact(port: serial.Serial, size: int) -> bytes:
    data = port.read(size)
    if len(data) != size:
        raise Uart4ProtocolError(f"expected {size} bytes, received {len(data)}")
    return data


def _to_snake_case(value: str) -> str:
    first_pass = re.sub(r"(.)([A-Z][a-z]+)", r"\1_\2", value)
    return re.sub(r"([a-z0-9])([A-Z])", r"\1_\2", first_pass).lower()
