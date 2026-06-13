from __future__ import annotations

from dataclasses import asdict, dataclass


DATA_TYPE_NAMES = {
    1: "char",
    2: "short",
    3: "long",
    4: "hex",
    5: "mac",
    6: "ip",
    7: "string",
}


@dataclass(frozen=True)
class MapEntry:
    key: str
    data_type: int
    length: int
    signed: bool
    default_value: str
    name: str | None
    section: str
    source: str = "DatabaseHelper.setInsertData()"

    def to_dict(self) -> dict:
        data = asdict(self)
        data["data_type_name"] = DATA_TYPE_NAMES.get(self.data_type, "unknown")
        return data


@dataclass(frozen=True)
class TemplateEntry:
    offset: str
    data_type: int
    length: int
    signed: bool
    default_value: str
    name: str | None

    def to_dict(self) -> dict:
        data = asdict(self)
        data["data_type_name"] = DATA_TYPE_NAMES.get(self.data_type, "unknown")
        return data


SYSTEM_ENTRIES = [
    MapEntry("0000", 2, 2, True, "0", "Service Pressure", "system"),
    MapEntry("0002", 2, 2, False, "0", "Comp Connect", "system"),
    MapEntry("0004", 2, 2, False, "0", "Stop Delay", "system"),
    MapEntry("0006", 2, 2, False, "0", "Sel Oilfree Injection", "system"),
    MapEntry("0008", 2, 2, False, "0", "Comp Used Time", "system"),
    MapEntry("000A", 2, 2, False, "0", "Comp Used Time", "system"),
    MapEntry("000C", 2, 2, False, "0", "Comp Used Time", "system"),
    MapEntry("000E", 2, 2, False, "0", "Comp Used Time", "system"),
    MapEntry("0010", 2, 2, False, "0", "Comp Used Time", "system"),
    MapEntry("0012", 2, 2, False, "0", "Comp Used Time", "system"),
    MapEntry("0014", 2, 2, False, "0", "Comp Used Time", "system"),
    MapEntry("0016", 2, 2, False, "0", "Unload Pressure", "system"),
    MapEntry("0018", 2, 2, False, "0", "Load Pressure", "system"),
    MapEntry("001A", 2, 2, False, "0", "Comp Pressure Level", "system"),
    MapEntry("001C", 2, 2, False, "0", "Low Alarm Pressure", "system"),
    MapEntry("001E", 2, 2, False, "0", "Dio Connect", "system"),
    MapEntry("0020", 2, 2, False, "0", "Ma420 Connect", "system"),
    MapEntry("0022", 2, 2, False, "0", "Total Individual Mode", "system"),
    MapEntry("0024", 2, 2, False, "0", "Comp Sort", "system"),
    MapEntry("0026", 2, 2, False, "0", "Somp Start Qty", "system"),
    MapEntry("0028", 2, 2, False, "0", "Run Sequence1", "system"),
    MapEntry("002A", 2, 2, False, "0", "Run Sequence2", "system"),
    MapEntry("002C", 2, 2, False, "0", "Run Sequence3", "system"),
    MapEntry("002E", 2, 2, False, "0", "Run Sequence4", "system"),
    MapEntry("0030", 2, 2, False, "0", "Run Sequence5", "system"),
    MapEntry("0032", 2, 2, False, "0", "Run Sequence6", "system"),
    MapEntry("0034", 2, 2, False, "0", "Run Sequence7", "system"),
    MapEntry("0036", 2, 2, False, "0", "Run Sequence8", "system"),
    MapEntry("0038", 2, 2, False, "0", "Run Sequence9", "system"),
    MapEntry("003A", 2, 2, False, "0", "Start Comp", "system"),
    MapEntry("003C", 2, 2, False, "0", "Run Delay Time", "system"),
    MapEntry("003E", 2, 2, False, "0", "Main Press Choice Part", "system"),
    MapEntry("0040", 2, 2, False, "0", "Autostop Time_min", "system"),
    MapEntry("0042", 2, 2, False, "0", "Autostop Time_hour", "system"),
    MapEntry("0044", 2, 2, False, "0", "Ext_run/stop", "system"),
    MapEntry("0046", 2, 2, False, "0", "Change Timer_hour", "system"),
    MapEntry("0048", 2, 2, False, "0", "Change Timer_min", "system"),
    MapEntry("004A", 2, 2, False, "0", "Option Device", "system"),
    MapEntry("004C", 2, 2, False, "0", "Use Device", "system"),
    MapEntry("004E", 2, 2, False, "0", "Use Comp Qty", "system"),
    MapEntry("0050", 2, 2, False, "0", "Total Run_Stop_L_R", "system"),
    MapEntry("0052", 2, 2, False, "0", "Alarm Bit Control", "system"),
    MapEntry("0054", 2, 2, False, "0", "Low Alarm Pressure Step", "system"),
    MapEntry("0056", 2, 2, False, "0", "Data Storage Comp", "system"),
    MapEntry("0058", 2, 2, False, "0", "Rev", "system"),
    MapEntry("005A", 2, 2, False, "0", "System Control", "system"),
    MapEntry("005C", 2, 2, False, "0", "Year_Week", "system"),
    MapEntry("005E", 2, 2, False, "0", "Month_Date", "system"),
    MapEntry("0060", 2, 2, False, "0", "Hour_Min", "system"),
    MapEntry("0062", 2, 2, False, "0", "Seconds", "system"),
]


NETWORK_ENTRIES = [
    MapEntry("0100", 5, 6, False, "70:C7:6F:FF:FF:FF", "Eth Mac Address", "network"),
    MapEntry("0106", 6, 4, False, "117.52.91.211", "Eth Server Address", "network"),
    MapEntry("010A", 2, 2, False, "7777", "Eth Server Port", "network"),
    MapEntry("010C", 5, 6, False, "70:C7:6F:83:00:01", "Wifi Mac Address", "network"),
    MapEntry("0112", 7, 16, False, "GSTECH", "Wifi Ap", "network"),
    MapEntry("0122", 7, 16, False, "", "Wifi Password", "network"),
    MapEntry("0132", 6, 4, False, "117.52.91.211", "Wifi Server Address", "network"),
    MapEntry("0136", 2, 2, False, "7777", "Wifi Server Port", "network"),
    MapEntry("0138", 1, 1, False, "1", "Eth Wifi Select", "network"),
    MapEntry("0139", 1, 1, False, "1", "Dhcp On/Off", "network"),
    MapEntry("013A", 6, 4, False, "192.168.0.10", "Eth Local Address", "network"),
    MapEntry("013E", 6, 4, False, "255.255.254.0", "Eth Local Subnetmask", "network"),
    MapEntry("0142", 6, 4, False, "192.168.0.1", "Eth Local GateWay", "network"),
    MapEntry("0146", 6, 4, False, "0.0.0.0", "Eth Auto Ip Address", "network"),
    MapEntry("014A", 6, 4, False, "0.0.0.0", "Wifi Auto Ip Address", "network"),
    MapEntry("014E", 2, 2, False, "1", "Data Send Duty", "network"),
    MapEntry("0150", 2, 2, False, "1", "Group ID", "network"),
    MapEntry("0152", 2, 2, False, "1", "System User ID_H", "network"),
    MapEntry("0154", 2, 2, False, "8", "System User ID_L", "network"),
    MapEntry("0156", 2, 2, False, "97", "Comp Connect Qty", "network"),
    MapEntry("0158", 2, 2, False, "0", "Model", "network"),
    MapEntry("015A", 2, 2, False, "2018", "Version", "network"),
    MapEntry("015C", 2, 2, False, "101", "Version Num", "network"),
    MapEntry("015E", 1, 1, False, "35", "Product ID", "network"),
    MapEntry("015F", 1, 1, False, "2", "Company ID", "network"),
    MapEntry("0160", 2, 2, False, "0", None, "network"),
]


INJECTION_TEMPLATE = [
    TemplateEntry("00", 2, 2, True, "0", "Service Pressure"),
    TemplateEntry("02", 2, 2, True, "0", "Service Temp"),
    TemplateEntry("04", 2, 2, True, "0", "Inv RPM"),
    TemplateEntry("06", 2, 2, True, "0", "Service Pressure1"),
    TemplateEntry("08", 2, 2, True, "0", "Service Temp1"),
    TemplateEntry("0A", 2, 2, False, "0", "Alarm"),
    TemplateEntry("0C", 2, 2, False, "0", "Fault Flg"),
    TemplateEntry("0E", 2, 2, False, "0", "Fault Inv"),
    TemplateEntry("10", 2, 2, False, "0", "Output Status"),
    TemplateEntry("12", 2, 2, False, "0", "Input Status"),
    TemplateEntry("14", 2, 2, False, "0", "Count Status"),
    TemplateEntry("16", 2, 2, False, "0", "Cp Status"),
    TemplateEntry("18", 2, 2, False, "0", "Run Mode"),
    TemplateEntry("1A", 2, 2, False, "0", "Ext Run/Stop"),
    TemplateEntry("1C", 2, 2, False, "0", "Max Pressure"),
    TemplateEntry("1E", 2, 2, False, "0", "Emer Stop Pressure"),
    TemplateEntry("20", 2, 2, False, "0", "Inv Target Pressure"),
    TemplateEntry("22", 2, 2, False, "0", "Inv Indirect Pressure"),
    TemplateEntry("24", 2, 2, False, "0", "Inv Direct Pressure"),
    TemplateEntry("26", 2, 2, False, "0", "Unload Pressure"),
    TemplateEntry("28", 2, 2, False, "0", "Load Pressure"),
    TemplateEntry("2A", 2, 2, False, "0", "Auto Stop Time"),
    TemplateEntry("2C", 2, 2, False, "0", "Auto Stop Delay Time"),
    TemplateEntry("2E", 2, 2, False, "0", "Stop Delay Time"),
    TemplateEntry("30", 2, 2, False, "0", "Vent Time"),
    TemplateEntry("32", 2, 2, False, "0", "YD Conversion Time"),
    TemplateEntry("34", 2, 2, False, "0", "Run Select Mode"),
    TemplateEntry("36", 2, 2, False, "0", "Remote Type"),
    TemplateEntry("38", 2, 2, False, "0", "Manual Unload Mode"),
    TemplateEntry("3A", 2, 2, False, "0", "Fan OnOff Mode"),
    TemplateEntry("3C", 2, 2, False, "0", "Load Temp"),
    TemplateEntry("3E", 2, 2, False, "0", "Fan On Temp"),
    TemplateEntry("40", 2, 2, False, "0", "Fan Off Temp"),
    TemplateEntry("42", 2, 2, False, "0", "Set Alarm Temp"),
    TemplateEntry("44", 2, 2, False, "0", "Set Fault Temp"),
    TemplateEntry("46", 2, 2, False, "0", "Admin Password"),
    TemplateEntry("48", 2, 2, False, "0", "Grees Use Time"),
    TemplateEntry("4A", 2, 2, False, "0", "Inv FREQ"),
    TemplateEntry("4C", 2, 2, False, "0", "Inv Max RPM"),
    TemplateEntry("4E", 2, 2, False, "0", "Inv Min RPM"),
    TemplateEntry("50", 2, 2, False, "0", "Air Filter Use Time"),
    TemplateEntry("52", 2, 2, False, "0", "Oil Filter Use Time"),
    TemplateEntry("54", 2, 2, False, "0", "Separator Use Time"),
    TemplateEntry("56", 2, 2, False, "0", "Oil Use Time"),
    TemplateEntry("58", 2, 2, False, "0", "Total Air Filt Time"),
    TemplateEntry("5A", 2, 2, False, "0", "Total Oil Filt Time"),
    TemplateEntry("5C", 2, 2, False, "0", "Total Separator Time"),
    TemplateEntry("5E", 2, 2, False, "0", "Total Oil Time"),
    TemplateEntry("60", 2, 2, False, "0", "Total Load Time"),
    TemplateEntry("62", 2, 2, False, "0", "Total Unload Time"),
    TemplateEntry("64", 2, 2, False, "0", "Total AutoStop Time"),
    TemplateEntry("66", 2, 2, False, "0", "Total Stop Time"),
    TemplateEntry("68", 2, 2, False, "0", "Total Run Time_L"),
    TemplateEntry("6A", 2, 2, False, "0", "Total Run Time_H"),
    TemplateEntry("6C", 2, 2, False, "0", "Total Run Count_L"),
    TemplateEntry("6E", 2, 2, False, "0", "Total Run Count_H"),
    TemplateEntry("70", 2, 2, False, "0", "System ID"),
    TemplateEntry("72", 2, 2, False, "0", "Model1"),
    TemplateEntry("74", 2, 2, False, "0", "Model2"),
    TemplateEntry("76", 2, 2, False, "0", "Version"),
    TemplateEntry("78", 2, 2, False, "0", "Total Grees Time"),
    TemplateEntry("7A", 2, 2, False, "0", "Version Num"),
    TemplateEntry("7C", 2, 2, False, "0", "Serial Year"),
    TemplateEntry("7E", 2, 2, False, "0", "Serial Lot"),
    TemplateEntry("80", 2, 2, False, "0", "Serial Number"),
    TemplateEntry("82", 2, 2, False, "0", ""),
    TemplateEntry("84", 2, 2, False, "0", ""),
    TemplateEntry("86", 2, 2, False, "0", ""),
    TemplateEntry("88", 2, 2, False, "0", ""),
    TemplateEntry("8A", 2, 2, False, "0", ""),
    TemplateEntry("8C", 2, 2, False, "0", ""),
    TemplateEntry("8E", 2, 2, False, "0", ""),
    TemplateEntry("90", 2, 2, False, "0", ""),
    TemplateEntry("92", 2, 2, False, "0", ""),
    TemplateEntry("94", 2, 2, False, "0", ""),
    TemplateEntry("96", 2, 2, False, "0", ""),
    TemplateEntry("98", 2, 2, False, "0", ""),
    TemplateEntry("9A", 2, 2, False, "0", ""),
    TemplateEntry("9C", 2, 2, False, "0", ""),
    TemplateEntry("9E", 2, 2, False, "0", ""),
    TemplateEntry("A0", 2, 2, False, "0", ""),
    TemplateEntry("A2", 2, 2, False, "0", ""),
    TemplateEntry("A4", 2, 2, False, "0", ""),
]


OILFREE_TEMPLATE = [
    TemplateEntry("00", 2, 2, True, "0", "Diachange Air Pressure"),
    TemplateEntry("02", 2, 2, True, "0", "Suction Air Diff. Pressure"),
    TemplateEntry("04", 2, 2, True, "0", "Hp Inlet Pressure"),
    TemplateEntry("06", 2, 2, True, "0", "Oil Pressure"),
    TemplateEntry("08", 2, 2, True, "0", "Spare"),
    TemplateEntry("0A", 2, 2, True, "0", "Spare"),
    TemplateEntry("0C", 2, 2, True, "0", "Discharge Air Temp"),
    TemplateEntry("0E", 2, 2, True, "0", "Lp Outlet Air Temp"),
    TemplateEntry("10", 2, 2, True, "0", "Hp Inlet Air Temp"),
    TemplateEntry("12", 2, 2, True, "0", "Hp Outlet Air Temp"),
    TemplateEntry("14", 2, 2, True, "0", "Oil Temp"),
    TemplateEntry("16", 2, 2, True, "0", "Spare"),
    TemplateEntry("18", 2, 2, True, "0", "Spare"),
    TemplateEntry("1A", 2, 2, True, "0", "Spare"),
    TemplateEntry("1C", 2, 2, True, "0", "Spare"),
    TemplateEntry("1E", 2, 2, True, "0", "Motor WTD Temp"),
    TemplateEntry("20", 2, 2, True, "0", "Motor WTD Temp"),
    TemplateEntry("22", 2, 2, True, "0", "Motor WTD Temp"),
    TemplateEntry("24", 2, 2, True, "0", "Motor BTD Temp"),
    TemplateEntry("26", 2, 2, True, "0", "Motor BTD Temp"),
    TemplateEntry("28", 2, 2, False, "0", "Alarm"),
    TemplateEntry("2A", 2, 2, False, "0", "Fault_L"),
    TemplateEntry("2C", 2, 2, False, "0", "Fault_H"),
    TemplateEntry("2E", 2, 2, False, "0", "Fault Inv"),
    TemplateEntry("30", 2, 2, False, "0", "Cp Status"),
    TemplateEntry("32", 2, 2, False, "0", "Output Status"),
    TemplateEntry("34", 2, 2, False, "0", "Input Status"),
    TemplateEntry("36", 2, 2, False, "0", "Count Status"),
    TemplateEntry("38", 2, 2, False, "0", "Inv RPM"),
    TemplateEntry("3A", 2, 2, False, "0", "Run Mode"),
    TemplateEntry("3C", 2, 2, False, "0", "Year_Week"),
    TemplateEntry("3E", 2, 2, False, "0", "Month_Day"),
    TemplateEntry("40", 2, 2, False, "0", "Hour_Min"),
    TemplateEntry("42", 2, 2, False, "0", "Sec"),
    TemplateEntry("44", 2, 2, False, "0", "Ext Run Stop"),
    TemplateEntry("46", 2, 2, False, "0", "Inv Target"),
    TemplateEntry("48", 2, 2, False, "0", "Inv InDirect"),
    TemplateEntry("4A", 2, 2, False, "0", "Inv Direct"),
    TemplateEntry("4C", 2, 2, False, "0", "Emer Stop Pressure"),
    TemplateEntry("4E", 2, 2, False, "0", "Unload Pressure"),
    TemplateEntry("50", 2, 2, False, "0", "Load Pressure"),
    TemplateEntry("52", 2, 2, False, "0", "Auto Stop Min"),
    TemplateEntry("54", 2, 2, False, "0", "Oil Start Sec"),
    TemplateEntry("56", 2, 2, False, "0", "YD Conversion Sec"),
    TemplateEntry("58", 2, 2, False, "0", "System ID"),
    TemplateEntry("5A", 2, 2, False, "0", "Drive Set Mode"),
    TemplateEntry("5C", 2, 2, False, "0", "Manual Unload Mode"),
    TemplateEntry("5E", 2, 2, False, "0", "Remote Type"),
    TemplateEntry("60", 2, 2, False, "0", "Tout1 Fault Temp"),
    TemplateEntry("62", 2, 2, False, "0", "Tout2 Fault Temp"),
    TemplateEntry("64", 2, 2, False, "0", "TOil Fault Temp"),
    TemplateEntry("66", 2, 2, False, "0", "PMax Limit"),
    TemplateEntry("68", 2, 2, False, "0", "P2In Fault"),
    TemplateEntry("6A", 2, 2, False, "0", "POil Fault"),
    TemplateEntry("6C", 2, 2, False, "0", "PAir Filter Def Alarm"),
    TemplateEntry("6E", 2, 2, False, "0", "Load Delay Sec"),
    TemplateEntry("70", 2, 2, False, "0", "Stop Delay Sec"),
    TemplateEntry("72", 2, 2, False, "0", "Air Filter Use Limit"),
    TemplateEntry("74", 2, 2, False, "0", "Oil Filter Use Limit"),
    TemplateEntry("76", 2, 2, False, "0", "Oil Use Limit"),
    TemplateEntry("78", 2, 2, False, "0", "Gress Use Limit"),
    TemplateEntry("7A", 2, 2, False, "0", "Load Temp"),
    TemplateEntry("7C", 2, 2, False, "0", "Model1"),
    TemplateEntry("7E", 2, 2, False, "0", "Version1"),
    TemplateEntry("80", 2, 2, False, "0", "Version2"),
    TemplateEntry("82", 2, 2, False, "0", "Version Num"),
    TemplateEntry("84", 2, 2, False, "0", "Inv FREQ"),
    TemplateEntry("86", 2, 2, False, "0", "Inv Max RPM"),
    TemplateEntry("88", 2, 2, False, "0", "Inv Min RPM"),
    TemplateEntry("8A", 2, 2, False, "0", "Total Air Filt Time"),
    TemplateEntry("8C", 2, 2, False, "0", "Total Oil Filt Time"),
    TemplateEntry("8E", 2, 2, False, "0", "Total Oil Time"),
    TemplateEntry("90", 2, 2, False, "0", "Total Gress Time"),
    TemplateEntry("92", 2, 2, False, "0", "Total Unload Time"),
    TemplateEntry("94", 2, 2, False, "0", "Total Load Time"),
    TemplateEntry("96", 2, 2, False, "0", "Total Autostop Time"),
    TemplateEntry("98", 2, 2, False, "0", "Total Stop Time"),
    TemplateEntry("9A", 2, 2, False, "0", "Total Run Time_L"),
    TemplateEntry("9C", 2, 2, False, "0", "Total Run Time_H"),
    TemplateEntry("9E", 2, 2, False, "0", "Total Run Count_L"),
    TemplateEntry("A0", 2, 2, False, "0", "Total Run Count_H"),
    TemplateEntry("A2", 2, 2, False, "0", "Serial Year"),
    TemplateEntry("A4", 2, 2, False, "0", "Serial Lot"),
]


DIO_TEMPLATE = [
    TemplateEntry("00", 2, 2, False, "0", None),
    TemplateEntry("02", 2, 2, False, "0", None),
    TemplateEntry("04", 2, 2, False, "0", None),
]


MODULE_TEMPLATE = [
    TemplateEntry("00", 2, 2, True, "0", None),
    TemplateEntry("02", 2, 2, True, "0", None),
    TemplateEntry("04", 2, 2, True, "0", None),
    TemplateEntry("06", 2, 2, True, "0", None),
    TemplateEntry("08", 2, 2, True, "0", None),
    TemplateEntry("0A", 2, 2, True, "0", None),
    TemplateEntry("0C", 2, 2, True, "0", None),
    TemplateEntry("0E", 2, 2, True, "0", None),
    TemplateEntry("10", 2, 2, True, "0", None),
    TemplateEntry("12", 2, 2, True, "0", None),
    TemplateEntry("14", 2, 2, True, "0", None),
    TemplateEntry("16", 2, 2, True, "0", None),
]


REQUEST_ADDRESS_MAP = {
    0: "00",
    1: "01",
    2: "11",
    3: "12",
    4: "13",
    5: "14",
    6: "15",
    7: "16",
    8: "17",
    9: "18",
    10: "19",
    11: "1A",
    12: "1B",
    13: "1C",
    14: "1D",
    15: "1E",
    16: "1F",
    17: "20",
    18: "21",
    19: "22",
    20: "E0",
    21: "E1",
    22: "E2",
    23: "E3",
    24: "E4",
    25: "E5",
    26: "E6",
    27: "E7",
    28: "E8",
    29: "E9",
    30: "EA",
    31: "EB",
    32: "EC",
    33: "ED",
    34: "EE",
    35: "EF",
    36: "F0",
    37: "F1",
    38: "F2",
    39: "F3",
    40: "F4",
    41: "F5",
    42: "F6",
    43: "F7",
    44: "F8",
    45: "F9",
    46: "FA",
    47: "FB",
    48: "FC",
    49: "FD",
    50: "FE",
    51: "FF",
    52: "31",
    53: "32",
    54: "33",
    55: "34",
    56: "35",
    57: "36",
    58: "37",
    59: "38",
}


def _build_template_entries(
    prefix_seed: str, template: list[TemplateEntry], section: str, count: int
) -> list[dict]:
    entries: list[dict] = []
    start_idx = 0 if prefix_seed in {"E", "F"} else 1
    end_idx = count if prefix_seed in {"E", "F"} else count + 1
    for idx in range(start_idx, end_idx):
        prefix = f"{prefix_seed}{idx:X}"
        for item in template:
            key = f"{prefix}{item.offset}"
            entries.append(
                MapEntry(
                    key=key,
                    data_type=item.data_type,
                    length=item.length,
                    signed=item.signed,
                    default_value=item.default_value,
                    name=item.name,
                    section=section,
                ).to_dict()
            )
    return entries


def build_yujin_map_schema() -> dict:
    return {
        "summary": {
            "system_count": len(SYSTEM_ENTRIES),
            "network_count": len(NETWORK_ENTRIES),
            "injection_template_count": len(INJECTION_TEMPLATE),
            "oilfree_template_count": len(OILFREE_TEMPLATE),
            "dio_template_count": len(DIO_TEMPLATE),
            "module_template_count": len(MODULE_TEMPLATE),
            "injection_equip_count": 15,
            "oilfree_equip_count": 15,
            "dio_group_count": 16,
            "module_group_count": 16,
            "expanded_entry_count": (
                len(SYSTEM_ENTRIES)
                + len(NETWORK_ENTRIES)
                + len(INJECTION_TEMPLATE) * 15
                + len(OILFREE_TEMPLATE) * 15
                + len(DIO_TEMPLATE) * 16
                + len(MODULE_TEMPLATE) * 16
            ),
        },
        "data_type_names": DATA_TYPE_NAMES,
        "request_address_map": REQUEST_ADDRESS_MAP,
        "system_entries": [entry.to_dict() for entry in SYSTEM_ENTRIES],
        "network_entries": [entry.to_dict() for entry in NETWORK_ENTRIES],
        "templates": {
            "injection": [entry.to_dict() for entry in INJECTION_TEMPLATE],
            "oilfree": [entry.to_dict() for entry in OILFREE_TEMPLATE],
            "dio": [entry.to_dict() for entry in DIO_TEMPLATE],
            "module": [entry.to_dict() for entry in MODULE_TEMPLATE],
        },
        "expanded_examples": {
            "injection": _build_template_entries("1", INJECTION_TEMPLATE, "injection", 15),
            "oilfree": _build_template_entries("2", OILFREE_TEMPLATE, "oilfree", 15),
            "dio": _build_template_entries("E", DIO_TEMPLATE, "dio", 16),
            "module": _build_template_entries("F", MODULE_TEMPLATE, "module", 16),
        },
    }
