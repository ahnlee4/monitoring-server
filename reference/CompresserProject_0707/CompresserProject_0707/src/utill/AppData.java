package utill;

import java.awt.Color;
import java.awt.Dimension;
import java.awt.GridLayout;
import java.io.File;
import java.io.FileOutputStream;
import java.io.FileReader;
import java.io.FileWriter;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.util.Base64;

import javax.crypto.Cipher;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import javax.crypto.spec.IvParameterSpec;
import javax.swing.JDialog;
import javax.swing.JLabel;
import javax.swing.JPanel;

import org.json.simple.JSONObject;
import org.json.simple.parser.JSONParser;

import border.RoundedBorder;
import main.FormMain;
import model.AioModel;
import model.ControlModel_00;
import model.ControlModel_01;
import model.DioModel;
import model.InjectionModel;
import model.MyModel;
import model.OilModel;
import model.OtherModel_03;
import model.OtherModel_04;
import model.OtherModel_05;
import sub.FormSub;

public class AppData {
	public static String VERSION = "240727";
	public static FormMain mainForm;
	public static FormSub subForm;
	public static boolean is_connected = false;
	
	public static int DISPLAY_SCALE = 1920;
	public static ControlModel_00 controlModel_00 = new ControlModel_00(null);
	public static ControlModel_01 controlModel_01 = new ControlModel_01(null);
	
	public static OtherModel_03 otherModel_03 = new OtherModel_03(null);
	public static OtherModel_04 otherModel_04 = new OtherModel_04(null);
	public static OtherModel_05 otherModel_05 = new OtherModel_05(null);
	
	public static DioModel dioModel[] = new DioModel[255];
	public static AioModel aioModel[] = new AioModel[255];
	
	public static MyModel deviceModel[] = new MyModel[16];
	public static TCPSocket socket;
	
	public static int CATEGORY_INJECTION = 100; // 인젝션
	public static int CATEGORY_OIL = 101; // 오일프리
	public static int CATEGORY_DIO1 = 0; // 
	public static int CATEGORY_DIO2 = 1; //
	
	public static int USER_LEVEL_0 = 0; // 관리자
	public static int USER_LEVEL_1 = 1; // 매니저
	public static int USER_LEVEL_2 = 2; // 일반
	public static int USER_FAIL = -1;
	
	public static String SERVER_IP = "121.164.120.200";
	public static int SERVER_PORT = 1502;
	public static String USER_0_PASSWORD = "btfss0510";
	public static String USER_1_PASSWORD = "471112";
	public static String USER_2_PASSWORD = "1234";
	public static boolean OPTION_LOGIN = false;
	public static boolean OPTION_ERROR = false;
	public static boolean OPTION_SOUND = false;
	public static int FACTORY_INDEX = 0;
	public static String FACTORY_1 = "1공장";
	public static String FACTORY_2 = "2공장";
	public static String FACTORY_3 = "3공장";
	public static String FACTORY_4 = "4공장";
	public static String FACTORY_5 = "5공장";
	
	public static String FACTORY_IP_1 = "121.164.120.200";
	public static String FACTORY_IP_2 = "";
	public static String FACTORY_IP_3 = "";
	public static String FACTORY_IP_4 = "";
	public static String FACTORY_IP_5 = "";
	
	public static int DIO_BIT0 = 0;
	public static int DIO_BIT4 = 1;
	
	public static String PATH = "settings.json";
	static SecretKey key;
	static IvParameterSpec ivParameterSpec = AESCryptoUtil.getIv();
	static String specName = "AES/CBC/PKCS5Padding";

	public static String bit_list[] = {"드라이어","흡착식 드라이어","애프터 쿨러","드라이어","냉동식 드라이어","트랜스미터","사용안함","흡착식 드라이어","드라이어_삼화양행","쿨러_삼화양행"};
	
	public static void init() {
		try {
			key = AESCryptoUtil.getKey();
			
			if(!new File(PATH).isFile()) setEncryptedFile();
			
			JSONParser parser = new JSONParser();

			FileReader reader = new FileReader(PATH);
			String str = "";
			char c;
			while(reader.ready()) {
				c = (char)reader.read();
				str += c;
			}

			String decrypted = AESCryptoUtil.decrypt(specName, key, ivParameterSpec, str);

			Object obj = parser.parse(decrypted);
			JSONObject jsonObject = (JSONObject) obj;
			
			SERVER_PORT = Integer.parseInt(jsonObject.get("SERVER_PORT").toString());
			USER_1_PASSWORD = (String) jsonObject.get("USER_1_PASSWORD");
			USER_2_PASSWORD = (String) jsonObject.get("USER_2_PASSWORD");
			OPTION_LOGIN = Boolean.parseBoolean(jsonObject.get("OPTION_LOGIN").toString());
			OPTION_ERROR = Boolean.parseBoolean(jsonObject.get("OPTION_ERROR").toString());
			OPTION_SOUND = Boolean.parseBoolean(jsonObject.get("OPTION_SOUND").toString());
			FACTORY_INDEX = Integer.parseInt(jsonObject.get("FACTORY_INDEX").toString());

			FACTORY_1 = (String) jsonObject.get("FACTORY_1");
			FACTORY_2 = (String) jsonObject.get("FACTORY_2");
			FACTORY_3 = (String) jsonObject.get("FACTORY_3");
			FACTORY_4 = (String) jsonObject.get("FACTORY_4");
			FACTORY_5 = (String) jsonObject.get("FACTORY_5");
			
			FACTORY_IP_1 = (String) jsonObject.get("FACTORY_IP_1");
			FACTORY_IP_2 = (String) jsonObject.get("FACTORY_IP_2");
			FACTORY_IP_3 = (String) jsonObject.get("FACTORY_IP_3");
			FACTORY_IP_4 = (String) jsonObject.get("FACTORY_IP_4");
			FACTORY_IP_5 = (String) jsonObject.get("FACTORY_IP_5");

			if(FACTORY_INDEX == 0) SERVER_IP = FACTORY_IP_1;
			else if(FACTORY_INDEX == 1) SERVER_IP = FACTORY_IP_2;
			else if(FACTORY_INDEX == 2) SERVER_IP = FACTORY_IP_3;
			else if(FACTORY_INDEX == 3) SERVER_IP = FACTORY_IP_4;
			else if(FACTORY_INDEX == 4) SERVER_IP = FACTORY_IP_5;
			
			if(SERVER_IP == null) SERVER_IP = "121.164.120.200";

			DIO_BIT0 = Integer.parseInt(jsonObject.get("DIO_BIT0").toString());
			DIO_BIT4 = Integer.parseInt(jsonObject.get("DIO_BIT4").toString());
			
			reader.close();
		} catch (Exception e) {
			e.printStackTrace();
			setEncryptedFile();
		}
	}
	
	public static void setEncryptedFile() {
		try {
			System.out.println("setEncryptedFile 생성");
			JSONObject obj = new JSONObject();
			obj.put("SERVER_IP", SERVER_IP);
			obj.put("SERVER_PORT", SERVER_PORT);
			obj.put("USER_1_PASSWORD", USER_1_PASSWORD);
			obj.put("USER_2_PASSWORD", USER_2_PASSWORD);
			obj.put("OPTION_LOGIN", OPTION_LOGIN);
			obj.put("OPTION_ERROR", OPTION_ERROR);
			obj.put("OPTION_SOUND", OPTION_SOUND);
			obj.put("FACTORY_INDEX", FACTORY_INDEX);
			
			obj.put("FACTORY_1", FACTORY_1);
			obj.put("FACTORY_2", FACTORY_2);
			obj.put("FACTORY_3", FACTORY_3);
			obj.put("FACTORY_4", FACTORY_4);
			obj.put("FACTORY_5", FACTORY_5);
			
			obj.put("FACTORY_IP_1", FACTORY_IP_1);
			obj.put("FACTORY_IP_2", FACTORY_IP_2);
			obj.put("FACTORY_IP_3", FACTORY_IP_3);
			obj.put("FACTORY_IP_4", FACTORY_IP_4);
			obj.put("FACTORY_IP_5", FACTORY_IP_5);

			obj.put("DIO_BIT0", DIO_BIT0);
			obj.put("DIO_BIT4", DIO_BIT4);
			
			if(FACTORY_INDEX == 0) SERVER_IP = FACTORY_IP_1;
			else if(FACTORY_INDEX == 1) SERVER_IP = FACTORY_IP_2;
			else if(FACTORY_INDEX == 2) SERVER_IP = FACTORY_IP_3;
			else if(FACTORY_INDEX == 3) SERVER_IP = FACTORY_IP_4;
			else if(FACTORY_INDEX == 4) SERVER_IP = FACTORY_IP_5;
			
			if(AppData.socket != null && (AppData.socket.getPort() != SERVER_PORT || AppData.socket.getInetAddress().toString() != SERVER_IP)) {
				new Thread(new Runnable() {
					@Override
					public void run() {
						AppData.socket.disconnect();
					}
				}).start();
				
			}
			
//			File dir = new File(PATH);
//			dir.mkdirs();
			
			FileWriter file = new FileWriter(PATH);
			String encrypted_json = AESCryptoUtil.encrypt(specName, key, ivParameterSpec, obj.toJSONString());
			
			file.write(encrypted_json);
			file.flush();
			file.close();
		} catch (Exception e) {
			e.printStackTrace();
		}
	}
	
	public static boolean isFloat(String str) {
		try {
			Float.parseFloat(str);
			return true;
		} catch (Exception e) {
			return false;
		}
	}
	
	public static boolean isNumber(String str) {
		try {
			Integer.parseInt(str);
			return true;
		} catch (Exception e) {
			return false;
		}
	}
	

	public static String getModelName(short model) {
		String str = "";
		if(model == 0) str = "11";
		else if(model == 1) str = "15";
		else if(model == 2) str = "15D";
		else if(model == 3) str = "22";
		else if(model == 4) str = "22D";
		else if(model == 5) str = "37";
		else if(model == 6) str = "55";
		else if(model == 7) str = "75";
		else if(model == 8) str = "110";
		else if(model == 9) str = "150";
		else if(model == 10) str = "190";
		else if(model == 11) str = "225";
		else if(model == 12) str = "260";
		else if(model == 13) str = "300";
		else if(model == 14) str = "375";
		else if(model == 15) str = "450";
		else if(model == 16) str = "???";
		else if(model == 17) str = "37V";
		else if(model == 18) str = "55V";
		else if(model == 19) str = "75V";
		else if(model == 20) str = "110V";
		else if(model == 21) str = "150V";
		else if(model == 22) str = "190V";
		else if(model == 23) str = "225V";
		else if(model == 24) str = "260V";
		else if(model == 25) str = "300V";
		else if(model == 26) str = "22V";
		else str = "???";
		return "Micos " + str;
	}
	
	public static String getModelOil(String e124, String ver1, String ver2) {
		StringBuffer name = new StringBuffer();
		if(e124.equals("0")) name.append("55F");
		else if(e124.equals("1")) name.append("75F");
		else if(e124.equals("2")) name.append("90F");
		else if(e124.equals("3")) name.append("110F");
		else if(e124.equals("4")) name.append("132F");
		else if(e124.equals("5")) name.append("160F");
		else if(e124.equals("6")) name.append("190F");
		else if(e124.equals("7")) name.append("225F");
		else if(e124.equals("8")) name.append("260F");
		else if(e124.equals("9")) name.append("135F");
		if(ver2.equals("0")) name.append("A");
		else if(ver2.equals("1")) name.append("W");
		if(ver1.equals("0")) name.append("-");
		else if(ver1.equals("1")) name.append("R");
		else if(ver1.equals("2")) name.append("S");
		else if(ver1.equals("3")) name.append("V");
		
		return "Micos " + name.toString();
	}

	public static String getVersionOil(String ver1, String ver2, String num) {
		StringBuffer name = new StringBuffer();
		name.append("YOF");
		if(ver1.equals("0")) name.append("F");
		else if(ver1.equals("3")) name.append("V");
		
		name.append(num);
		
		if(ver2.equals("0")) name.append("d");
		else if(ver2.equals("1")) name.append("w");
		
		return name.toString();
	}
	
	public static void showToast(String title) {
		JDialog dialog = new JDialog();
		JPanel panel = new JPanel(new GridLayout());
		dialog.setContentPane(panel);

		dialog.setUndecorated(true);
		dialog.setAlwaysOnTop(true);
		dialog.setDefaultCloseOperation(javax.swing.WindowConstants.HIDE_ON_CLOSE);
		dialog.getRootPane().setOpaque(false);
		dialog.getContentPane().setBackground (new Color (0, 0, 0, 0));
		dialog.setBackground(new Color (0, 0, 0, 0));

		panel.add(new MyLabel(title, 0, MyFont.Font_24, MyColor.WHITE));
		panel.setBorder(new RoundedBorder(MyColor.GREEN, 70, MyColor.GREEN));
		
		panel.setOpaque(true);
		dialog.setSize(300, 70);
		dialog.setBounds((1920-300)/2, 20, 300, 70);
		dialog.show();
		
		new Thread(new Runnable() {
			@Override
			public void run() {
				try {
					Thread.sleep(1500);
					dialog.dispose();
				} catch (Exception e) {
				}
			}
		}).start();
	}
	
	public static void showErrorToast(String title) {
		JDialog dialog = new JDialog();
		JPanel panel = new JPanel(new GridLayout());
		JLabel title_label;
		
		dialog.setContentPane(panel);

		dialog.setUndecorated(true);
		dialog.setAlwaysOnTop(true);
		dialog.setDefaultCloseOperation(javax.swing.WindowConstants.HIDE_ON_CLOSE);
		dialog.getRootPane().setOpaque(false);
		dialog.getContentPane().setBackground (new Color (0, 0, 0, 0));
		dialog.setBackground(new Color (0, 0, 0, 0));
		
		panel.add(title_label = new MyLabel(title, 0, MyFont.Font_24, MyColor.WHITE));
		panel.setBorder(new RoundedBorder(MyColor.RED, 70, MyColor.RED));
		
		panel.setOpaque(true);
		
		int stringWidth = title_label.getFontMetrics(MyFont.Font_24).stringWidth(title_label.getText())+20;
		title_label.setPreferredSize(new Dimension(stringWidth, 30));
		
		dialog.setSize(stringWidth, 70);
		dialog.setBounds((1920-stringWidth)/2, 20, stringWidth, 70);
		dialog.show();
		
		new Thread(new Runnable() {
			@Override
			public void run() {
				try {
					Thread.sleep(1500);
					dialog.dispose();
				} catch (Exception e) {
				}
			}
		}).start();
	}
	
	
	public static byte bitWrite(byte b, int index, boolean flag) {
		byte bt = 0x00;
		int bits[] = {0x01,0x02,0x04,0x08,0x10,0x20,0x40,0x80};
		for(int i=0; i<8; i++) {
			if(i == index) {
				if(flag) bt += bits[i];
			}else {
				if(((b >> i) & 0x01) == 0x01) {
					bt += bits[i];	
				}
			}
		}
		return bt;
	}
}

