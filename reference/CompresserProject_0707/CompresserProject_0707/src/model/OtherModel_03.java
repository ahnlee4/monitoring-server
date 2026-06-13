package model;

import utill.AppData;

public class OtherModel_03{
	public OtherModel_03(byte data[]) {
		if(data == null) return;
		
		String str = new String(data);
		str = str.substring(6, str.length());
		
		String line[] = str.split("=");
		try {
			ALIGN_LIST = line[0];
			CAM1_IP = line[1];
			CAM1_PORT = line[2];
			CAM2_IP = line[3];
			CAM2_PORT = line[4];
		} catch (Exception e) {
			e.printStackTrace();
		}
		
	}
	public String ALIGN_LIST = "";
	public String CAM1_IP = "";
	public String CAM1_PORT = "";
	public String CAM2_IP = "";
	public String CAM2_PORT = "";
}
