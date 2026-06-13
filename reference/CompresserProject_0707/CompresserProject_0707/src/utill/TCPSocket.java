package utill;

import java.io.IOException;
import java.net.Socket;
import java.net.UnknownHostException;

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

public class TCPSocket extends Socket {
	public TCPSocket(String ip, int port) throws UnknownHostException, IOException {
		super(ip, port);
		isRunning = true;
		rxThread.setDaemon(true);
		rxThread.start();
	}

	boolean isRunning = false;
	Thread rxThread = new Thread(new Runnable() {
		@Override
		public void run() {
			try {
				while (isRunning) {
					if (getInputStream().available() > 0) {
						parser((byte) getInputStream().read());
					}
				}
			} catch (Exception e) {
				e.printStackTrace();
			}
		}
	});

	byte bytes[] = new byte[65535];
	int be_seq = 0;
	int seq = 0;
	int fun = 0;
	int seq_cnt = 0;
	byte map[][] = new byte[12][1024];
	int map_index = 0;
	int map_cnt = 0;
	int bytes_cnt = 0;
	int data_len = 0;

	public void parser(byte b) {
		bytes[bytes_cnt] = b;
		bytes_cnt++;
		System.out.print(String.format("%02X ", b));
		if (seq == 0) {
			if (b == (byte) 0x65) {
				map[map_index][map_cnt] = b;
				map_cnt++;
				seq++;
			} else {
				clear();
			}
		} else if (seq == 1) {
			if (b == (byte) 0xA0 || b == (byte) 0xA1) {
				fun = b;
				map[map_index][map_cnt] = b;
				map_cnt = 0;
				map_index++;
				System.out.println();
				seq++;
			} else if (b == (byte) 0x15) { // 수정 데이터
				fun = b;
				map[map_index][map_cnt] = b;
				map_cnt = 0;
				map_index++;
				System.out.println();
				seq++;
			} else {
				clear();
			}
		} else {
			if (fun == (byte) 0xA0 || fun == (byte) 0xA1) {
				parser_request(b);
			} else if (fun == (byte) 0x15) {
				parser_write(b);
			}
		}

		if (be_seq != seq) {
			be_seq = seq;
			seq_cnt = 0;
		}
	}

	public void parser_request(byte b) {
		if (seq == 2) {
			seq_cnt++;
			if (seq_cnt == 1) {
				map[map_index][map_cnt++] = b;
			} else if (seq_cnt == 2) {
				map[map_index][map_cnt++] = b;

				if (map[map_index][0] == (byte) 0x65 && map[map_index][1] == (byte) 0x13) {
					seq++;
				} else {
					CRC16 crc = new CRC16();
					for (int i = 0; i < bytes_cnt; i++) {
						crc.update(bytes[i]);
					}
					byte[] byteStr = new byte[2];
					byteStr[0] = (byte) ((crc.getValue() & 0x000000ff));
					byteStr[1] = (byte) ((crc.getValue() & 0x0000ff00) >>> 8);

					if (byteStr[0] == 0 && byteStr[1] == 0) {
						System.out.println("CRC 성공");

						ControlModel_00 controlModel_00 = new ControlModel_00(null);
						ControlModel_01 controlModel_01 = new ControlModel_01(null);

						OtherModel_03 otherModel_03 = new OtherModel_03(null);
						OtherModel_04 otherModel_04 = new OtherModel_04(null);
						OtherModel_05 otherModel_05 = new OtherModel_05(null);

						DioModel dioModel[] = new DioModel[255];
						AioModel aioModel[] = new AioModel[255];

						MyModel deviceModel[] = new MyModel[16];

						for (int i = 0; i < map.length; i++) {
							if (map[i][0] == (byte) 0x65 && map[i][1] == (byte) 0x13) {
								int addr = map[i][2];
								if (addr == (byte) 0x00) {
									controlModel_00 = new ControlModel_00(map[i]);
								} else if (addr == (byte) 0x01) {
									controlModel_01 = new ControlModel_01(map[i]);
								} else if (addr == (byte) 0x03) {
									otherModel_03 = new OtherModel_03(map[i]);
								} else if (addr == (byte) 0x04) {
									otherModel_04 = new OtherModel_04(map[i]);
								} else if (addr == (byte) 0x05) {
									otherModel_05 = new OtherModel_05(map[i]);
								} else if (addr >= (byte) 0x11 && addr <= (byte) 0x1F) {
									int bit = addr - 0x11;
									if (controlModel_00.SEL_OILFREE_INJECTION >> bit == (byte) 0x01) {
										deviceModel[addr - 0x11] = new OilModel(map[i]);
									} else {
										deviceModel[addr - 0x11] = new InjectionModel(map[i]);
									}
								} else if (addr >= (byte) 0xE0 && addr <= (byte) 0xEF) {
									dioModel[addr - (byte) 0xE0] = new DioModel(map[i]);
									dioModel[addr - (byte) 0xE0]._has = true;
								} else if (addr >= (byte) 0xF0 && addr <= (byte) 0xFF) {
									aioModel[addr - (byte) 0xF0] = new AioModel(map[i]);
									aioModel[addr - (byte) 0xF0]._has = true;
								}
							}
						}

						if (fun == (byte) 0xA0) {
							AppData.controlModel_00 = controlModel_00;
							AppData.controlModel_01 = controlModel_01;
							AppData.deviceModel = deviceModel;
							AppData.dioModel = dioModel;
							AppData.aioModel = aioModel;
						} else if (fun == (byte) 0xA1) {
							AppData.otherModel_03 = otherModel_03;
							AppData.otherModel_04 = otherModel_04;
							AppData.otherModel_05 = otherModel_05;
						}

						clear();
					} else {
						clear();
					}
				}
			}
		} else if (seq == 3) {
			seq_cnt++;
			map[map_index][map_cnt++] = b;
			if (seq_cnt == 4) {
				seq++;
			}
		} else if (seq == 4) {
			seq_cnt++;
			map[map_index][map_cnt++] = b;
			int len = map[map_index][5] & 0xFF;

			if (map_cnt == len + 6) {
				map_index++;
				map_cnt = 0;
				seq = 2;
				System.out.println();
			}
		}
	}

	public void parser_write(byte b) {
		if (seq == 2) {
			seq_cnt++;
			if (seq_cnt == 2) {
				data_len = bytes[2] << 8 | bytes[3];
				seq++;
			}
		} else if (seq == 3) {
			seq_cnt++;
			if (seq_cnt == 2) {
				seq++;
			}
		} else if (seq == 4) {
			seq_cnt++;
			if (seq_cnt == 2) {
				CRC16 crc = new CRC16();
				for (int i = 0; i < bytes_cnt; i++) {
					crc.update(bytes[i]);
				}
				byte[] byteStr = new byte[2];
				byteStr[0] = (byte) ((crc.getValue() & 0x000000ff));
				byteStr[1] = (byte) ((crc.getValue() & 0x0000ff00) >>> 8);

				if (byteStr[0] == 0 && byteStr[1] == 0) {
					System.out.println("CRC 성공");

					clear();
				}
			}
		}
	}

	public void clear() {
		System.out.println("초기화");
		bytes = new byte[1024];
		be_seq = 0;
		seq = 0;
		seq_cnt = 0;
		map = new byte[12][255];
		map_index = 0;
		map_cnt = 0;
		bytes_cnt = 0;
	}

	public void disconnect() {
		System.out.println("연결해제");
		AppData.is_connected = false;
		try {
			if (AppData.socket != null)
				AppData.socket.close();
			if (rxThread != null)
				rxThread.interrupt();
			AppData.socket = new TCPSocket(AppData.SERVER_IP, AppData.SERVER_PORT);
			if (AppData.socket != null) {
				AppData.is_connected = true;
			}
		} catch (UnknownHostException e) {
			e.printStackTrace();
		} catch (Exception e) {
			e.printStackTrace();
		}
	}

	public void otherSend() {
		byte i_array[] = new byte[8];
		i_array[0] = (byte) 0xC9;
		i_array[1] = (byte) 0xA1;
		i_array[2] = (byte) 0x00;
		i_array[3] = (byte) 0x00;
		i_array[4] = (byte) 0x00;
		i_array[5] = (byte) 0x00;

		CRC16 crc = new CRC16();
		for (int i = 0; i < 6; i++) {
			crc.update(i_array[i]);
		}
		System.out.println(Integer.toHexString((int) crc.getValue()));
		byte[] byteStr = new byte[2];
		byteStr[0] = (byte) ((crc.getValue() & 0x000000ff));
		byteStr[1] = (byte) ((crc.getValue() & 0x0000ff00) >>> 8);

		i_array[6] = (byte) byteStr[0];
		i_array[7] = (byte) byteStr[1];
		try {
			getOutputStream().write(i_array);
		} catch (Exception e) {
			disconnect();
		}
	}

	public void mapSend() throws Exception {
		byte i_array[] = new byte[8];
		i_array[0] = (byte) 0xC9;
		i_array[1] = (byte) 0xA0;
		i_array[2] = (byte) 0x00;
		i_array[3] = (byte) 0x00;
		i_array[4] = (byte) 0x00;
		i_array[5] = (byte) 0x00;

		CRC16 crc = new CRC16();
		for (int i = 0; i < 6; i++) {
			crc.update(i_array[i]);
		}
		System.out.println(Integer.toHexString((int) crc.getValue()));
		byte[] byteStr = new byte[2];
		byteStr[0] = (byte) ((crc.getValue() & 0x000000ff));
		byteStr[1] = (byte) ((crc.getValue() & 0x0000ff00) >>> 8);

		i_array[6] = (byte) byteStr[0];
		i_array[7] = (byte) byteStr[1];
		try {
			getOutputStream().write(i_array);
		} catch (Exception e) {
			disconnect();
			e.printStackTrace();
		}
	}

	public void sendOption(short val) {
		byte data[] = new byte[2];
		data[0] = (byte) (val >> 8);
		data[1] = (byte) val;
		mapSend((short) 74, (short) 2, data);
	}
	
	public void sendAlign(short val) {
		byte data[] = new byte[2];
		data[0] = (byte) (val >> 8);
		data[1] = (byte) val;
		mapSend((short) 36, (short) 2, data);
	}

	public void sendSingleMode(short val) {
		byte data[] = new byte[2];
		data[0] = 0;
		data[1] = (byte) val;
		mapSend((short) 34, (short) 2, data);
	}

	public void sendLocalMode(short val) {
		byte data[] = new byte[2];
		data[0] = (byte) val; // 상위 8bit
		mapSend((short) 80, (short) 2, data);
	}

	public void sendControlUnload(short val) {
		byte data[] = new byte[2];
		data[0] = (byte) (val >> 8);
		data[1] = (byte) val;
		mapSend((short) 22, (short) 2, data);
	}

	public void sendControlLoad(short val) {
		byte data[] = new byte[2];
		data[0] = (byte) (val >> 8);
		data[1] = (byte) val;
		mapSend((short) 24, (short) 2, data);
	}

	public void sendControlPress(short val) {
		byte data[] = new byte[2];
		data[0] = (byte) (val >> 8);
		data[1] = (byte) val;
		mapSend((short) 26, (short) 2, data);
	}

	public void sendControlLow(short val) {
		byte data[] = new byte[2];
		data[0] = (byte) (val >> 8);
		data[1] = (byte) val;
		mapSend((short) 84, (short) 2, data);
	}

	public void sendControlTime(short val) {
		byte data[] = new byte[2];
		data[0] = (byte) (val >> 8);
		data[1] = (byte) val;
		mapSend((short) 66, (short) 2, data);
	}

	public void sendControlUnit(short val) {
		byte data[] = new byte[2];
		data[0] = (byte) (val >> 8);
		data[1] = (byte) val;
		mapSend((short) 38, (short) 2, data);
	}

	public void sendMap(short addr, short val) {
		byte data[] = new byte[2];
		data[0] = (byte) (val >> 8);
		data[1] = (byte) val;
		mapSend(addr, (short) 2, data);
	}

	public void sendRun(short val) {
		byte i_array[] = new byte[255];
		i_array[0] = (byte) 0xC9;
		i_array[1] = (byte) 0x60;
		i_array[2] = (byte) 0x50;
		i_array[3] = (byte) 0;
		i_array[4] = (byte) val;

		CRC16 crc = new CRC16();
		for (int i = 0; i < 5; i++) {
			crc.update(i_array[i]);
		}
		byte[] byteStr = new byte[2];
		byteStr[0] = (byte) ((crc.getValue() & 0x000000ff));
		byteStr[1] = (byte) ((crc.getValue() & 0x0000ff00) >>> 8);

		i_array[5] = (byte) byteStr[0];
		i_array[6] = (byte) byteStr[1];

		System.out.println("send : ");
		for (int i = 0; i < 7; i++) {
			System.out.print(String.format("%02X ", i_array[i]));
		}
		System.out.println();

		try {
			getOutputStream().write(i_array, 0, 7);
			AppData.showToast("데이터 변경");
		} catch (Exception e) {
			disconnect();
			e.printStackTrace();
		}
	}

	public void sendChangeCount(short index, short count) {
		byte i_array[] = new byte[255];
		i_array[0] = (byte) 0xC9;
		i_array[1] = (byte) 0x80;
		i_array[2] = (byte) 0x11;
		i_array[3] = (byte) index;
		i_array[4] = (byte) count;

		CRC16 crc = new CRC16();
		for (int i = 0; i < 5; i++) {
			crc.update(i_array[i]);
		}
		byte[] byteStr = new byte[2];
		byteStr[0] = (byte) ((crc.getValue() & 0x000000ff));
		byteStr[1] = (byte) ((crc.getValue() & 0x0000ff00) >>> 8);

		i_array[5] = (byte) byteStr[0];
		i_array[6] = (byte) byteStr[1];

		System.out.println("send : ");
		for (int i = 0; i < 7; i++) {
			System.out.print(String.format("%02X ", i_array[i]));
		}
		System.out.println();

		try {
			getOutputStream().write(i_array, 0, 7);
			AppData.showToast("데이터 변경");
		} catch (Exception e) {
			disconnect();
			e.printStackTrace();
		}
	}

	public void sendOther04(short addr, short val) {
		byte i_array[] = new byte[255];
		i_array[0] = (byte) 0xC9;
		i_array[1] = (byte) 0x82;
		i_array[2] = (byte) addr;
		i_array[3] = (byte) (val >> 8);
		i_array[4] = (byte) val;

		CRC16 crc = new CRC16();
		for (int i = 0; i < 5; i++) {
			crc.update(i_array[i]);
		}
		byte[] byteStr = new byte[2];
		byteStr[0] = (byte) ((crc.getValue() & 0x000000ff));
		byteStr[1] = (byte) ((crc.getValue() & 0x0000ff00) >>> 8);

		i_array[5] = (byte) byteStr[0];
		i_array[6] = (byte) byteStr[1];

		System.out.println("send : ");
		for (int i = 0; i < 7; i++) {
			System.out.print(String.format("%02X ", i_array[i]));
		}
		System.out.println();

		try {
			getOutputStream().write(i_array, 0, 7);
			AppData.showToast("데이터 변경");
		} catch (Exception e) {
			disconnect();
			e.printStackTrace();
		}
	}

	public void sendOther0300(String str) {
		byte i_array[] = new byte[255];
		i_array[0] = (byte) 0xC9;
		i_array[1] = (byte) 0x83;
		i_array[2] = (byte) 0x00;

		int cnt = 3;
		for (int i = 0; i < str.length(); i++) {
			i_array[cnt] = (byte) str.charAt(i);
			cnt++;
		}

		CRC16 crc = new CRC16();
		for (int i = 0; i < cnt; i++) {
			crc.update(i_array[i]);
		}
		byte[] byteStr = new byte[2];
		byteStr[0] = (byte) ((crc.getValue() & 0x000000ff));
		byteStr[1] = (byte) ((crc.getValue() & 0x0000ff00) >>> 8);

		i_array[cnt] = (byte) byteStr[0];
		cnt++;
		i_array[cnt] = (byte) byteStr[1];
		cnt++;

		System.out.println("send : ");
		for (int i = 0; i < cnt; i++) {
			System.out.print(String.format("%02X ", i_array[i]));
		}
		System.out.println();

		try {
			getOutputStream().write(i_array, 0, cnt);
			AppData.showToast("데이터 변경");
		} catch (Exception e) {
			disconnect();
			e.printStackTrace();
		}
	}

	public void mapSend(short addr, short len, byte... data) {
		byte i_array[] = new byte[255];
		i_array[0] = (byte) 0xC9;
		i_array[1] = (byte) 0x20;
		i_array[2] = (byte) (addr >> 8);
		i_array[3] = (byte) addr;
		i_array[4] = (byte) (len >> 8);
		i_array[5] = (byte) len;

		for (int i = 0; i < len; i++) {
			i_array[6 + i] = data[i];
		}

		CRC16 crc = new CRC16();
		for (int i = 0; i < 6 + len; i++) {
			crc.update(i_array[i]);
		}
		byte[] byteStr = new byte[2];
		byteStr[0] = (byte) ((crc.getValue() & 0x000000ff));
		byteStr[1] = (byte) ((crc.getValue() & 0x0000ff00) >>> 8);

		i_array[6 + len] = (byte) byteStr[0];
		i_array[7 + len] = (byte) byteStr[1];

		System.out.println("send : ");
		for (int i = 0; i < 8 + len; i++) {
			System.out.print(String.format("%02X ", i_array[i]));
		}
		System.out.println();

		try {
			getOutputStream().write(i_array, 0, 8 + len);
			AppData.showToast("데이터 변경");
		} catch (Exception e) {
			disconnect();
			e.printStackTrace();
		}
	}
}
