package model;

public class OtherModel_04{
	public OtherModel_04(byte data[]) {
		if(data == null) return;
		int point = 6;

		YEAR = (short) (data[point++] & 0xFF);
		MONTH = (short) (data[point++] & 0xFF);
		DAY = (short) (data[point++] & 0xFF);
		HOUR = (short) (data[point++] & 0xFF);
		MINUTE = (short) (data[point++] & 0xFF);
		SECOND = (short) (data[point++] & 0xFF);
		 
		INV_PLUSMINUS = (short) (((data[point++] & 0xFF) << 8) | (data[point++] & 0xFF));
		RUNNING_DELAY = (short) (((data[point++] & 0xFF) << 8) | (data[point++] & 0xFF));
		RUNNING_DELAY_SEC = (short) (((data[point++] & 0xFF) << 8) | (data[point++] & 0xFF));
		BIT_CHECK = (short) (((data[point++] & 0xFF) << 8) | (data[point++] & 0xFF));
		UNLOAD_SET = (short) (((data[point++] & 0xFF) << 8) | (data[point++] & 0xFF));
		LOAD_SET = (short) (((data[point++] & 0xFF) << 8) | (data[point++] & 0xFF));
		RUN_UNIT_0 = (short) (((data[point++] & 0xFF) << 8) | (data[point++] & 0xFF));
		RUN_UNIT_1 = (short) (((data[point++] & 0xFF) << 8) | (data[point++] & 0xFF));
		RUN_UNIT_2 = (short) (((data[point++] & 0xFF) << 8) | (data[point++] & 0xFF));
		RUN_UNIT_3 = (short) (((data[point++] & 0xFF) << 8) | (data[point++] & 0xFF));
		RUN_UNIT_4 = (short) (((data[point++] & 0xFF) << 8) | (data[point++] & 0xFF));
		RUN_UNIT_5 = (short) (((data[point++] & 0xFF) << 8) | (data[point++] & 0xFF));
		RUN_UNIT_6 = (short) (((data[point++] & 0xFF) << 8) | (data[point++] & 0xFF));
		USE_UNIT = (short) (((data[point++] & 0xFF) << 8) | (data[point++] & 0xFF));
		DEVICE_PRESS_0 = (short) (((data[point++] & 0xFF) << 8) | (data[point++] & 0xFF));
		DEVICE_PRESS_1 = (short) (((data[point++] & 0xFF) << 8) | (data[point++] & 0xFF));
		DEVICE_PRESS_2 = (short) (((data[point++] & 0xFF) << 8) | (data[point++] & 0xFF));
		DEVICE_PRESS_3 = (short) (((data[point++] & 0xFF) << 8) | (data[point++] & 0xFF));
		DEVICE_PRESS_4 = (short) (((data[point++] & 0xFF) << 8) | (data[point++] & 0xFF));
		DEVICE_PRESS_5 = (short) (((data[point++] & 0xFF) << 8) | (data[point++] & 0xFF));
		DEVICE_PRESS_6 = (short) (((data[point++] & 0xFF) << 8) | (data[point++] & 0xFF));
		DEVICE_PRESS_7 = (short) (((data[point++] & 0xFF) << 8) | (data[point++] & 0xFF));
		DEVICE_PRESS_8 = (short) (((data[point++] & 0xFF) << 8) | (data[point++] & 0xFF));
		DEVICE_PRESS_9 = (short) (((data[point++] & 0xFF) << 8) | (data[point++] & 0xFF));
		DEVICE_PRESS_10 = (short) (((data[point++] & 0xFF) << 8) | (data[point++] & 0xFF));
		DEVICE_PRESS_11 = (short) (((data[point++] & 0xFF) << 8) | (data[point++] & 0xFF));
		DEVICE_PRESS_12 = (short) (((data[point++] & 0xFF) << 8) | (data[point++] & 0xFF));
		DEVICE_PRESS_13 = (short) (((data[point++] & 0xFF) << 8) | (data[point++] & 0xFF));
		DEVICE_PRESS_14 = (short) (((data[point++] & 0xFF) << 8) | (data[point++] & 0xFF));
		DEVICE_PRESS_15 = (short) (((data[point++] & 0xFF) << 8) | (data[point++] & 0xFF));
		DEVICE_PRESS_MAIN = (short) (((data[point++] & 0xFF) << 8) | (data[point++] & 0xFF));
		MAIN_INVERTER_DEVICE = (short) (((data[point++] & 0xFF) << 8) | (data[point++] & 0xFF));
		OPTION = (short) (((data[point++] & 0xFF) << 8) | (data[point++] & 0xFF));
		
		USE_UNIT_COUNT = (short) (((data[66+11] & 0xFF) << 8) | (data[67+11] & 0xFF));
	}

	public short YEAR;
	public short MONTH;
	public short DAY;
	public short HOUR;
	public short MINUTE;
	public short SECOND;
	
	public short INV_PLUSMINUS;
	public short RUNNING_DELAY;
	public short RUNNING_DELAY_SEC;
	public short BIT_CHECK;
	public short UNLOAD_SET;
	public short LOAD_SET;
	public short RUN_UNIT_0;
	public short RUN_UNIT_1;
	public short RUN_UNIT_2;
	public short RUN_UNIT_3;
	public short RUN_UNIT_4;
	public short RUN_UNIT_5;
	public short RUN_UNIT_6;
	public short USE_UNIT;
	public short DEVICE_PRESS_0;
	public short DEVICE_PRESS_1;
	public short DEVICE_PRESS_2;
	public short DEVICE_PRESS_3;
	public short DEVICE_PRESS_4;
	public short DEVICE_PRESS_5;
	public short DEVICE_PRESS_6;
	public short DEVICE_PRESS_7;
	public short DEVICE_PRESS_8;
	public short DEVICE_PRESS_9;
	public short DEVICE_PRESS_10;
	public short DEVICE_PRESS_11;
	public short DEVICE_PRESS_12;
	public short DEVICE_PRESS_13;
	public short DEVICE_PRESS_14;
	public short DEVICE_PRESS_15;
	public short DEVICE_PRESS_MAIN;
	public short MAIN_INVERTER_DEVICE;
	public short OPTION;
	
	public short USE_UNIT_COUNT;
}
