package model;

public class ControlModel_01{
	public ControlModel_01(byte data[]) {
		if(data == null) return;
		int point = 6;

		for(int i=0; i<6; i++) {
			ETH_MAC_ADDRESS[i] = (char) data[point++];	
		}

		for(int i=0; i<4; i++) {
			ETH_SERVER_ADDRESS[i] = (char) data[point++];	
		}
		
		ETH_SERVER_PORT = (short) (((data[point++] & 0xFF) << 8) | (data[point++] & 0xFF));

		for(int i=0; i<6; i++) {
			WIFI_MAC_ADDRESS[i] = (char) data[point++];	
		}

		for(int i=0; i<16; i++) {
			WIFI_AP[i] = (char) data[point++];	
		}
		
		for(int i=0; i<16; i++) {
			WIFI_PASSWORD[i] = (char) data[point++];	
		}
		for(int i=0; i<4; i++) {
			WIFI_SERVER_ADDRESS[i] = (char) data[point++];	
		}
		WIFI_SERVER_PORT = (short) (((data[point++] & 0xFF) << 8) | (data[point++] & 0xFF));

		ETH_WIFI_SELECT = (char) data[point++];	
		DHCP_ON_OFF = (char) data[point++];	
		
		for(int i=0; i<4; i++) {
			ETH_LOCAL_ADDRESS[i] = (char) data[point++];	
		}
		for(int i=0; i<4; i++) {
			ETH_LOCAL_SUBNETMASK[i] = (char) data[point++];	
		}
		for(int i=0; i<4; i++) {
			ETH_LOCAL_GATEWAY[i] = (char) data[point++];	
		}
		for(int i=0; i<4; i++) {
			ETH_AUTO_IP_ADDRESS[i] = (char) data[point++];	
		}
		for(int i=0; i<4; i++) {
			WIFI_AUTO_IP_ADDRESS[i] = (char) data[point++];	
		}
		
		DATA_SEND_DUTY = (short) (((data[point++] & 0xFF) << 8) | (data[point++] & 0xFF));
		GROUP_ID = (short) (((data[point++] & 0xFF) << 8) | (data[point++] & 0xFF));
		SYSTEM_USER_ID_H = (short) (((data[point++] & 0xFF) << 8) | (data[point++] & 0xFF));
		SYSTEM_USER_ID = (short) (((data[point++] & 0xFF) << 8) | (data[point++] & 0xFF));
		COMP_CONNECT_QTY = (short) (((data[point++] & 0xFF) << 8) | (data[point++] & 0xFF));
		MODEL = (short) (((data[point++] & 0xFF) << 8) | (data[point++] & 0xFF));
		VERSION = (short) (((data[point++] & 0xFF) << 8) | (data[point++] & 0xFF));
		VERSION_NUM = (short) (((data[point++] & 0xFF) << 8) | (data[point++] & 0xFF));
		PRODUCT_ID = (char) data[point++];	
		COMPANY_ID = (char) data[point++];	

		for(int i=0; i<64; i++) {
			WIFI_AP2[i] = (char) data[point++];	
		}
		for(int i=0; i<64; i++) {
			WIFI_PASSWORD2[i] = (char) data[point++];	
		}
	}
	public char ETH_MAC_ADDRESS[] = new char[6];
	public char ETH_SERVER_ADDRESS[] = new char[4];
	public short ETH_SERVER_PORT;
	public char WIFI_MAC_ADDRESS[] = new char[6];
	public char WIFI_AP[] = new char[16];
	public char WIFI_PASSWORD[] = new char[16];
	public char WIFI_SERVER_ADDRESS[] = new char[4];
	public short WIFI_SERVER_PORT;
	public char ETH_WIFI_SELECT;
	public char DHCP_ON_OFF;
	public char ETH_LOCAL_ADDRESS[] = new char[4];
	public char ETH_LOCAL_SUBNETMASK[] = new char[4];
	public char ETH_LOCAL_GATEWAY[] = new char[4];
	public char ETH_AUTO_IP_ADDRESS[] = new char[4];
	public char WIFI_AUTO_IP_ADDRESS[] = new char[4];
	public short DATA_SEND_DUTY;
	public short GROUP_ID;
	public short SYSTEM_USER_ID_H;
	public short SYSTEM_USER_ID;
	public short COMP_CONNECT_QTY;
	public short MODEL;
	public short VERSION;
	public short VERSION_NUM;
	public char PRODUCT_ID;
	public char COMPANY_ID;
	public char WIFI_AP2[] = new char[64];
	public char WIFI_PASSWORD2[] = new char[64];

}
