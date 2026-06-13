package model;

public class ControlModel_00 {

	public ControlModel_00() {

	}

	public ControlModel_00(byte data[]) {
		if (data == null)
			return;
		int point = 6;
		SERVICE_PRESSURE = (short) (((data[point++] & 0xFF) << 8) | (data[point++] & 0xFF));
		COMP_CONNECT = (short) (((data[point++] & 0xFF) << 8) | (data[point++] & 0xFF));
		CHANGE_STOP_DELAY = (short) (((data[point++] & 0xFF) << 8) | (data[point++] & 0xFF));
		SEL_OILFREE_INJECTION = (short) (((data[point++] & 0xFF) << 8) | (data[point++] & 0xFF));
		SET_VIEW_COMP = (short) (((data[point++] & 0xFF) << 8) | (data[point++] & 0xFF));
		LOW_ALARM_PRESSURE_LEVEL = (short) (((data[point++] & 0xFF) << 8) | (data[point++] & 0xFF));
		LOW_ALARM_TIME_LEVEL = (short) (((data[point++] & 0xFF) << 8) | (data[point++] & 0xFF));

		COMP_USED_TIME[0] = (short) (((data[point++] & 0xFF) << 8) | (data[point++] & 0xFF));
		COMP_USED_TIME[1] = (short) (((data[point++] & 0xFF) << 8) | (data[point++] & 0xFF));
		COMP_USED_TIME[2] = (short) (((data[point++] & 0xFF) << 8) | (data[point++] & 0xFF));
		COMP_USED_TIME[3] = (short) (((data[point++] & 0xFF) << 8) | (data[point++] & 0xFF));

		UNLOAD_PRESSURE = (short) (((data[point++] & 0xFF) << 8) | (data[point++] & 0xFF));
		LOAD_PRESSURE = (short) (((data[point++] & 0xFF) << 8) | (data[point++] & 0xFF));
		COMP_PRESSURE_LEVEL = (short) (((data[point++] & 0xFF) << 8) | (data[point++] & 0xFF));
		LOW_ALARM_PRESSURE = (short) (((data[point++] & 0xFF) << 8) | (data[point++] & 0xFF));
		DIO_CONNECT = (short) (((data[point++] & 0xFF) << 8) | (data[point++] & 0xFF));
		MA420_CONNECT = (short) (((data[point++] & 0xFF) << 8) | (data[point++] & 0xFF));
		TOTAL_INDIVIDUAL_MODE = (short) (((data[point++] & 0xFF) << 8) | (data[point++] & 0xFF));
		COMP_SORT = (short) (((data[point++] & 0xFF) << 8) | (data[point++] & 0xFF));
		COMP_START_QTY = (short) (((data[point++] & 0xFF) << 8) | (data[point++] & 0xFF));

		RUN_SEQUENCE[0] = (short) (((data[point++] & 0xFF) << 8) | (data[point++] & 0xFF));
		RUN_SEQUENCE[1] = (short) (((data[point++] & 0xFF) << 8) | (data[point++] & 0xFF));
		RUN_SEQUENCE[2] = (short) (((data[point++] & 0xFF) << 8) | (data[point++] & 0xFF));
		RUN_SEQUENCE[3] = (short) (((data[point++] & 0xFF) << 8) | (data[point++] & 0xFF));
		RUN_SEQUENCE[4] = (short) (((data[point++] & 0xFF) << 8) | (data[point++] & 0xFF));
		RUN_SEQUENCE[5] = (short) (((data[point++] & 0xFF) << 8) | (data[point++] & 0xFF));
		RUN_SEQUENCE[6] = (short) (((data[point++] & 0xFF) << 8) | (data[point++] & 0xFF));
		RUN_SEQUENCE[7] = (short) (((data[point++] & 0xFF) << 8) | (data[point++] & 0xFF));
		RUN_SEQUENCE[8] = (short) (((data[point++] & 0xFF) << 8) | (data[point++] & 0xFF));

		START_COMP = (short) (((data[point++] & 0xFF) << 8) | (data[point++] & 0xFF));
		RUN_DELAY_TIME_SEC = (short) (((data[point++] & 0xFF) << 8) | (data[point++] & 0xFF));
		MAIN_PRESS_CHOICE_PART = (short) (((data[point++] & 0xFF) << 8) | (data[point++] & 0xFF));
		AUTOSTOP_TIME_MIN = (short) (((data[point++] & 0xFF) << 8) | (data[point++] & 0xFF));
		CHANGE_TIME_HOUR = (short) (((data[point++] & 0xFF) << 8) | (data[point++] & 0xFF));
		EXT_RUN_STOP = (short) (((data[point++] & 0xFF) << 8) | (data[point++] & 0xFF));
		CHANGE_TIMER_HOUR = (short) (((data[point++] & 0xFF) << 8) | (data[point++] & 0xFF));
		CHANGE_TIMER_MIN = (short) (((data[point++] & 0xFF) << 8) | (data[point++] & 0xFF));
		OPTION_DEVICE = (short) (((data[point++] & 0xFF) << 8) | (data[point++] & 0xFF));
		USE_DEVICE = (short) (((data[point++] & 0xFF) << 8) | (data[point++] & 0xFF));
		USE_COMP_QTY = (short) (((data[point++] & 0xFF) << 8) | (data[point++] & 0xFF));
		TOTAL_RUN_STOP_L_R = (short) (((data[point++] & 0xFF) << 8) | (data[point++] & 0xFF));
		ALARM_BIT_CONTROL_BIT = (short) (((data[point++] & 0xFF) << 8) | (data[point++] & 0xFF));
		LOW_ALARM_PRESSURE_STEP = (short) (((data[point++] & 0xFF) << 8) | (data[point++] & 0xFF));
		DATA_STORAGE_COMP = (short) (((data[point++] & 0xFF) << 8) | (data[point++] & 0xFF));
		REV_88 = (short) (((data[point++] & 0xFF) << 8) | (data[point++] & 0xFF));
		SYSTEM_CONT = (short) (((data[point++] & 0xFF) << 8) | (data[point++] & 0xFF));
		Year_Week = (short) (((data[point++] & 0xFF) << 8) | (data[point++] & 0xFF));
		Month_Date = (short) (((data[point++] & 0xFF) << 8) | (data[point++] & 0xFF));
		Hour_Min = (short) (((data[point++] & 0xFF) << 8) | (data[point++] & 0xFF));
		Seconds = (short) (((data[point++] & 0xFF) << 8) | (data[point++] & 0xFF));
	}

	public short SERVICE_PRESSURE;
	public short COMP_CONNECT;
	public short CHANGE_STOP_DELAY;
	public short SEL_OILFREE_INJECTION;
	public short SET_VIEW_COMP;
	public short LOW_ALARM_PRESSURE_LEVEL;
	public short LOW_ALARM_TIME_LEVEL;
	public short COMP_USED_TIME[] = new short[4];
	public short UNLOAD_PRESSURE;
	public short LOAD_PRESSURE;
	public short COMP_PRESSURE_LEVEL;
	public short LOW_ALARM_PRESSURE;
	public short DIO_CONNECT;
	public short MA420_CONNECT;
	public short TOTAL_INDIVIDUAL_MODE;
	public short COMP_SORT;
	public short COMP_START_QTY;
	public short RUN_SEQUENCE[] = new short[9];
	public short START_COMP;
	public short RUN_DELAY_TIME_SEC;
	public short MAIN_PRESS_CHOICE_PART;
	public short AUTOSTOP_TIME_MIN;
	public short CHANGE_TIME_HOUR;
	public short EXT_RUN_STOP;
	public short CHANGE_TIMER_HOUR;
	public short CHANGE_TIMER_MIN;
	public short OPTION_DEVICE;
	public short USE_DEVICE;
	public short USE_COMP_QTY;
	public short TOTAL_RUN_STOP_L_R;
	public short ALARM_BIT_CONTROL_BIT;
	public short LOW_ALARM_PRESSURE_STEP;
	public short DATA_STORAGE_COMP;
	public short REV_88;
	public short SYSTEM_CONT;
	public short Year_Week;
	public short Month_Date;
	public short Hour_Min;
	public short Seconds;
}
