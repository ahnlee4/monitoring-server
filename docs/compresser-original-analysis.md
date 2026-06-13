# CompresserProject Original Analysis

Source archive: `C:\Users\admin1\Downloads\CompresserProject_0707.zip`

Extracted reference path: `reference/CompresserProject_0707/CompresserProject_0707`

## What The Original Is

The original project is an Eclipse Java Swing GUI application.

- Entry point: `src/mainInfo.java`
- Main window: `src/main/FormMain.java`
- Main dashboard: `src/main/PanelContent.java`
- Footer controls/options: `src/main/PanelFooter.java`
- Top status bar: `src/com/PanelTop.java`
- Protocol/client logic: `src/utill/TCPSocket.java`
- CRC implementation: `src/utill/CRC16.java`
- Runtime settings: encrypted `settings.json`
- Assets: `src/images/*.png`

The application is designed as a 1920x1080 fullscreen control dashboard for a compressor integrated control system.

## Communication Model

This section is reference-only. The original Java communication/protocol implementation is not the target protocol for the Ubuntu web version.

The original Java GUI does not directly open a COM/UART port. It uses a TCP socket:

- Default server IP: `121.164.120.200`
- Default port: `1502`
- Socket implementation: `utill.TCPSocket extends Socket`

The GUI periodically sends two request frames:

- Map request: `C9 A0 00 00 00 00 <crc_lo> <crc_hi>`
- Other request: `C9 A1 00 00 00 00 <crc_lo> <crc_hi>`

It expects response frames beginning with:

- `65 A0` for main map data
- `65 A1` for other data
- `65 15` for write response/update data

CRC is Modbus-style CRC16 with initial value `0xFFFF` and low-byte-first output.

## Response Parsing

`TCPSocket.parser()` receives bytes one at a time, validates frame structure, verifies CRC, then decodes multiple internal maps.

Decoded map address routing:

- `0x00`: `ControlModel_00`
- `0x01`: `ControlModel_01`
- `0x03`: `OtherModel_03`
- `0x04`: `OtherModel_04`
- `0x05`: `OtherModel_05`
- `0x11` to `0x1F`: compressor device data
- `0xE0` to `0xEF`: DIO modules
- `0xF0` to `0xFF`: AIO modules

Compressor devices are decoded as either `OilModel` or `InjectionModel` depending on `ControlModel_00.SEL_OILFREE_INJECTION`.

## Important Dashboard Fields

Main top bar:

- Integrated run state: `ControlModel_00.TOTAL_RUN_STOP_L_R`
- Main pressure: `ControlModel_00.SERVICE_PRESSURE / 100.0`
- Firmware version: `ControlModel_01.VERSION` + `ControlModel_01.VERSION_NUM`

Device cards:

- Display order: `ControlModel_00.RUN_SEQUENCE`
- Visible count: `ControlModel_00.USE_COMP_QTY`
- Connected bitset: `ControlModel_00.COMP_CONNECT`
- Pressure, temperature, status, run mode, alarm, fault, total runtime
- Inverter devices show target pressure and RPM
- Non-inverter devices show unload/load pressure

Footer control values:

- Unload pressure: `ControlModel_00.UNLOAD_PRESSURE / 10.0`
- Load pressure: `ControlModel_00.LOAD_PRESSURE / 10.0`
- Pressure difference: `ControlModel_00.COMP_PRESSURE_LEVEL / 10.0`
- Start quantity: `ControlModel_00.COMP_START_QTY`
- Change operation time: `ControlModel_00.CHANGE_TIME_HOUR`
- Remaining time: `ControlModel_00.CHANGE_TIMER_HOUR`, `CHANGE_TIMER_MIN`
- Options: `ControlModel_00.OPTION_DEVICE` bit flags

## Write Commands

The original GUI sends write commands through `TCPSocket`.

- Generic map write: `C9 20 <addr_hi> <addr_lo> <len_hi> <len_lo> <data...> <crc_lo> <crc_hi>`
- Integrated run/stop: `C9 60 50 00 <val> <crc_lo> <crc_hi>`
- Change count: `C9 80 11 <index> <count> <crc_lo> <crc_hi>`
- Other model write: `C9 82 <addr> <val_hi> <val_lo> <crc_lo> <crc_hi>`
- Other string write: `C9 83 00 <ascii...> <crc_lo> <crc_hi>`

Examples from the Java code:

- `sendControlUnload`: write addr `22`, len `2`
- `sendControlLoad`: write addr `24`, len `2`
- `sendControlPress`: write addr `26`, len `2`
- `sendAlign`: write addr `36`, len `2`
- `sendControlUnit`: write addr `38`, len `2`
- `sendControlTime`: write addr `66`, len `2`
- `sendOption`: write addr `74`, len `2`
- `sendLocalMode`: write addr `80`, len `2`
- `sendControlLow`: write addr `84`, len `2`

## Web/Ubuntu Migration Notes

The current web project is a monitoring MVP. For this migration, the original Java project should be used as the screen/layout reference only.

For the Ubuntu board deployment, the right architecture is:

1. Rework the React dashboard to match the original compressor control screen structure.
2. Target the Ubuntu board display size first, especially 1280x800.
3. Keep backend/collector protocol work isolated until the correct serial/UART protocol is provided.
4. Normalize future serial values into backend telemetry/current-value records after the real protocol is confirmed.
5. Add guarded write endpoints only after the real protocol and control semantics are confirmed.

## Immediate Implementation Target

The first useful milestone should be UI-first:

- Recreate the top bar, 8 compressor cards, alarm strip, and footer control area from the Java GUI.
- Drive the screen with mock data that matches the expected compressor fields.
- Keep all protocol-specific serial code out of scope until the real protocol is supplied.

After read-only validation against real hardware, enable write/control commands.
