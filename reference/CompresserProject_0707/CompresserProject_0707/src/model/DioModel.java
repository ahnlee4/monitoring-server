package model;

public class DioModel extends MyModel{
	public boolean _has = false;
	public DioModel(byte data[]) {
		if(data == null) return;
		int point = 6;

		INPUT_STATUS = (short) (((data[point++] & 0xFF) << 8) | (data[point++] & 0xFF));
		OUTPUT_STATUS = (short) (((data[point++] & 0xFF) << 8) | (data[point++] & 0xFF));
		EXT_OUTPUT_CONTROL_CMD = (short) (((data[point++] & 0xFF) << 8) | (data[point++] & 0xFF));
	}
	
	public short INPUT_STATUS;
	public short OUTPUT_STATUS;
	public short EXT_OUTPUT_CONTROL_CMD;
}
