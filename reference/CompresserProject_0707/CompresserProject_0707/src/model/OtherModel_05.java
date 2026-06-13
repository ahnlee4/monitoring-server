package model;

public class OtherModel_05{
	public OtherModel_05(byte data[]) {
		if(data == null) return;
		
		String str = new String(data);
		str = str.substring(6, str.length());
		
		String line[] = str.split("=");
		try {
			EFFECTIV_POWER_ALL = line[0];
			EFFECTIV_POWER_0 = line[1];
			EFFECTIV_POWER_1 = line[2];
			EFFECTIV_POWER_2 = line[3];
			EFFECTIV_POWER_3 = line[4];
			EFFECTIV_POWER_4 = line[5];
			EFFECTIV_POWER_5 = line[6];
			EFFECTIV_POWER_6 = line[7];
			EFFECTIV_POWER_7 = line[8];
			EFFECTIV_POWER_8 = line[9];
			EFFECTIV_POWER_9 = line[10];
			EFFECTIV_POWER_10 = line[11];
			EFFECTIV_POWER_11 = line[12];
			EFFECTIV_POWER_DAY = line[13];
		} catch (Exception e) {
		}
	}
	
	public String EFFECTIV_POWER_ALL;
	public String EFFECTIV_POWER_0;
	public String EFFECTIV_POWER_1;
	public String EFFECTIV_POWER_2;
	public String EFFECTIV_POWER_3;
	public String EFFECTIV_POWER_4;
	public String EFFECTIV_POWER_5;
	public String EFFECTIV_POWER_6;
	public String EFFECTIV_POWER_7;
	public String EFFECTIV_POWER_8;
	public String EFFECTIV_POWER_9;
	public String EFFECTIV_POWER_10;
	public String EFFECTIV_POWER_11;
	public String EFFECTIV_POWER_DAY;
}
