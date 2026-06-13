package model;

public class AioModel extends MyModel{
	public boolean _has = false;
	public AioModel(byte data[]) {
		if(data == null) return;
		int point = 6;

		CH1_OUT = (short) (((data[point++] & 0xFF) << 8) | (data[point++] & 0xFF));
		CH2_OUT = (short) (((data[point++] & 0xFF) << 8) | (data[point++] & 0xFF));
		CH1_MIN = (short) (((data[point++] & 0xFF) << 8) | (data[point++] & 0xFF));
		CH1_MAX = (short) (((data[point++] & 0xFF) << 8) | (data[point++] & 0xFF));
		CH2_MIN = (short) (((data[point++] & 0xFF) << 8) | (data[point++] & 0xFF));
		CH2_MAX = (short) (((data[point++] & 0xFF) << 8) | (data[point++] & 0xFF));
		CH1_CAL = (short) (((data[point++] & 0xFF) << 8) | (data[point++] & 0xFF));
		CH2_CAL = (short) (((data[point++] & 0xFF) << 8) | (data[point++] & 0xFF));
		CH1_4MA_POINT = (short) (((data[point++] & 0xFF) << 8) | (data[point++] & 0xFF));
		CH1_20MA_POINT = (short) (((data[point++] & 0xFF) << 8) | (data[point++] & 0xFF));
		CH2_4MA_POINT = (short) (((data[point++] & 0xFF) << 8) | (data[point++] & 0xFF));
		CH2_20MA_POINT = (short) (((data[point++] & 0xFF) << 8) | (data[point++] & 0xFF));
		DAC_DATA_CH1 = (short) (((data[point++] & 0xFF) << 8) | (data[point++] & 0xFF));
		DAC_DATA_CH2 = (short) (((data[point++] & 0xFF) << 8) | (data[point++] & 0xFF));
		DAC_CAL_CH1 = (short) (((data[point++] & 0xFF) << 8) | (data[point++] & 0xFF));
		DAC_CAL_CH2 = (short) (((data[point++] & 0xFF) << 8) | (data[point++] & 0xFF));
		DAC_CONTROL = (short) (((data[point++] & 0xFF) << 8) | (data[point++] & 0xFF));
	}

	public short CH1_OUT;
	public short CH2_OUT;
	public short CH1_MIN;
	public short CH1_MAX;
	public short CH2_MIN;
	public short CH2_MAX;
	public short CH1_CAL;
	public short CH2_CAL;
	public short CH1_4MA_POINT;
	public short CH1_20MA_POINT;
	public short CH2_4MA_POINT;
	public short CH2_20MA_POINT;
	public short DAC_DATA_CH1;
	public short DAC_DATA_CH2;
	public short DAC_CAL_CH1;
	public short DAC_CAL_CH2;
	public short DAC_CONTROL;
}
