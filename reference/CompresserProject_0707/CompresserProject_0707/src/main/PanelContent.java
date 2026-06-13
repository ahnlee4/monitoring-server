package main;

import java.awt.Color;
import java.awt.Dimension;
import java.awt.FlowLayout;
import java.awt.GridLayout;
import java.awt.Image;
import java.awt.event.MouseEvent;
import java.awt.event.MouseListener;
import java.util.ArrayList;
import java.util.logging.Handler;

import javax.swing.ImageIcon;
import javax.swing.JLabel;
import javax.swing.JPanel;
import javax.swing.border.EmptyBorder;
import javax.swing.border.LineBorder;

import model.DeviceInfo;
import model.InjectionModel;
import model.MyModel;
import model.OilModel;
import sub.FormSub;
import utill.AppData;
import utill.MyColor;
import utill.MyFont;
import utill.MyLabel;
import utill.MyPanel;

public class PanelContent extends JPanel {
	PanelDevice panelDevice[] = new PanelDevice[8];
	
	JPanel main_panel;
	JPanel alram_panel;
	JPanel dis_panel;
	
	JLabel dis_label;
	JLabel alram_label;
	
	public PanelContent(int scale) {
		int col = 4;
		setLayout(null);

		add(dis_panel = new MyPanel(new GridLayout()));
		add(alram_panel = new MyPanel(new GridLayout()));
		add(main_panel = new MyPanel(new GridLayout(0, col)));
		
		alram_panel.setBackground(MyColor.GRAY);
		alram_panel.setOpaque(true);
		alram_panel.add(alram_label = new MyLabel("", 0, MyFont.Font_32, MyColor.RED));

		dis_panel.setBackground(new Color(0f,0f,0f,0.6f));
		dis_panel.setOpaque(true);
		dis_panel.add(dis_label = new MyLabel("TCP DISCONNECT",0, MyFont.Font_120, MyColor.CLOSE));
		
		if (scale == 1920) {
			int width = 1920;
			int height = 780;
			int device_width = (width - (col * 8)) / col;
			int device_height = (height - 26) / 2;
			int alram_height = 60;
			int dis_height = 300;

			main_panel.setPreferredSize(new Dimension(width, height));
			main_panel.setBounds(0, 0, width, height);
			
			alram_panel.setPreferredSize(new Dimension(width, alram_height));
			alram_panel.setBounds(0, height-alram_height-2, width, alram_height);
			
			dis_panel.setPreferredSize(new Dimension(width, dis_height));
			dis_panel.setBounds(0, ((height-dis_height)/2), width, dis_height);
			
			alram_label.setPreferredSize(new Dimension(width, alram_height));
			
			setPreferredSize(new Dimension(width, height));
			
			main_panel.add(panelDevice[0] = new PanelDevice(device_width, device_height, new DeviceInfo()));
			main_panel.add(panelDevice[1] = new PanelDevice(device_width, device_height, new DeviceInfo()));
			main_panel.add(panelDevice[2] = new PanelDevice(device_width, device_height, new DeviceInfo()));
			main_panel.add(panelDevice[3] = new PanelDevice(device_width, device_height, new DeviceInfo()));
			main_panel.add(panelDevice[4] = new PanelDevice(device_width, device_height, new DeviceInfo()));
			main_panel.add(panelDevice[5] = new PanelDevice(device_width, device_height, new DeviceInfo()));
			main_panel.add(panelDevice[6] = new PanelDevice(device_width, device_height, new DeviceInfo()));
			main_panel.add(panelDevice[7] = new PanelDevice(device_width, device_height, new DeviceInfo()));
		} else {

		}
		setBorder(new EmptyBorder(2, 2, 2, 2));
		setOpaque(false);
	}
	
	long time = 0;
	public boolean is_time500 = false;
	public void refresh() {
		for (int i = 0; i < 8; i++) {
			int index = AppData.controlModel_00.RUN_SEQUENCE[i] - 1;
			if (i < AppData.controlModel_00.USE_COMP_QTY) {
				if (AppData.deviceModel[index] instanceof InjectionModel) {
					InjectionModel model = (InjectionModel) AppData.deviceModel[index];
					panelDevice[i].deviceInfo.index = index;
					panelDevice[i].deviceInfo.type = AppData.getModelName(model.MODEL_2);
					panelDevice[i].deviceInfo.press = model.SERVICE_PRESSURE / 100.0f;
					panelDevice[i].deviceInfo.temp = model.SERVICE_TEMP / 10.0f;
					panelDevice[i].deviceInfo.status = model.CP_STATUS;
					panelDevice[i].deviceInfo.mode = model.RUN_MODE;
					panelDevice[i].deviceInfo.alarm = model.ALARM != 0;
					panelDevice[i].deviceInfo.totalTime = (model.TOTAL_RUN_TIME_H << 8 | model.TOTAL_RUN_TIME_L);
					panelDevice[i].deviceInfo.connected = ((AppData.controlModel_00.COMP_CONNECT >> index)
							& 0x01) == 0x01;

					if (model.MODEL_1 == 2) {
						panelDevice[i].deviceInfo.is_inverter = true;
						panelDevice[i].deviceInfo.control_press = model.INV_TARGET_PRESSURE / 10.0f;
						panelDevice[i].deviceInfo.rpm = model.INV_RPM;
						panelDevice[i].deviceInfo.fault = model.FAULT_FLG != 0 | model.FAULT_INV != 0;
					} else {
						panelDevice[i].deviceInfo.is_inverter = false;
						panelDevice[i].deviceInfo.load = model.LOAD_PRESSURE / 10.0f;
						panelDevice[i].deviceInfo.noload = model.UNLOAD_PRESSURE / 10.0f;
						panelDevice[i].deviceInfo.fault = model.FAULT_FLG != 0;
					}
				} else if (AppData.deviceModel[index] instanceof OilModel) {
					OilModel model = (OilModel) AppData.deviceModel[index];

					panelDevice[i].deviceInfo.index = index;
					panelDevice[i].deviceInfo.type = AppData.getModelOil(model.mMODEL_1+"", model.mVERSION_1+"", model.mVERSION_2+"");
					panelDevice[i].deviceInfo.press = model.P1/100.0f;
					panelDevice[i].deviceInfo.temp = model.T1;
					panelDevice[i].deviceInfo.status = model.mCP_STATUS;
					panelDevice[i].deviceInfo.mode = model.mRUN_MODE;
					panelDevice[i].deviceInfo.alarm = model.mALARM_FLAG != 0;
					panelDevice[i].deviceInfo.totalTime = (model.mTOTAL_RUN_TIME_H << 8 | model.mTOTAL_RUN_TIME_L);
					panelDevice[i].deviceInfo.connected = ((AppData.controlModel_00.COMP_CONNECT >> index)
							& 0x01) == 0x01;

					if (panelDevice[i].deviceInfo.type.indexOf("V") != -1) {
						panelDevice[i].deviceInfo.is_inverter = true;
						panelDevice[i].deviceInfo.control_press = model.mINV_TargetP/10.0f;
						panelDevice[i].deviceInfo.rpm = model.mINV_RPM;
						panelDevice[i].deviceInfo.fault = (model.mFAULT_FLG_H << 8 | model.mFAULT_FLG_L) != 0 | model.mFAULT_INV != 0;
					} else {
						panelDevice[i].deviceInfo.is_inverter = false;
						panelDevice[i].deviceInfo.load = model.mLOAD_P/10.0f;
						panelDevice[i].deviceInfo.noload = model.mUNLOAD_P/10.0f;
						panelDevice[i].deviceInfo.fault = (model.mFAULT_FLG_H << 8 | model.mFAULT_FLG_L) != 0;
					}
				} else {
					panelDevice[i].deviceInfo.index = index;
					panelDevice[i].deviceInfo.type = "Micos ---";
					panelDevice[i].deviceInfo.connected = ((AppData.controlModel_00.COMP_CONNECT >> index)
							& 0x01) == 0x01;
				}
				panelDevice[i].refresh();
			} else {
				panelDevice[i].setVisible(false);
			}
		}
		
		if (AppData.controlModel_00.LOW_ALARM_PRESSURE_STEP == 5) {
		    if (!alram_panel.isVisible()) alram_panel.setVisible(true);
		    alram_label.setForeground(MyColor.BLUE);
		    if(((AppData.controlModel_00.OPTION_DEVICE >> 9) & 0x01) == 0x01) {
		        if(!alram_label.getText().equals("저압 경보로 인하여 예비기 가동중")) alram_label.setText("저압 경보로 인하여 예비기 가동중");
		    } else{
		        if(!alram_label.getText().equals("저압 경보 알람")) alram_label.setText("저압 경보 알람");
		    }
		}else if (AppData.controlModel_00.LOW_ALARM_PRESSURE_STEP == 4) {
		    if (!alram_panel.isVisible()) alram_panel.setVisible(true);
		    alram_label.setForeground(MyColor.RED);
		    if(((AppData.controlModel_00.OPTION_DEVICE >> 9) & 0x01) == 0x01) {
		        if(!alram_label.getText().equals("저압 경보로 인하여 예비기 가동중")) alram_label.setText("저압 경보로 인하여 예비기 가동중");
		    }else {
		        if(!alram_label.getText().equals("저압 경보 알람")) alram_label.setText("저압 경보 알람");
		    }
		} else if(AppData.controlModel_00.LOW_ALARM_PRESSURE_STEP == 3) {
		    if (!alram_panel.isVisible()) alram_panel.setVisible(true);
		    alram_label.setForeground(MyColor.RED);
	        if(!alram_label.getText().equals("저압 경보 알람")) alram_label.setText("저압 경보 알람");
		}else {
		    alram_panel.setVisible(false);
		}
		
		if(AppData.is_connected) {
			dis_panel.setVisible(false);
		}else {
			dis_panel.setVisible(true);
		}
		
		if (System.currentTimeMillis() - time > 500) {
			time = System.currentTimeMillis();
			is_time500 = !is_time500;
		}
	}

	class PanelDevice extends JPanel {
		JPanel main, sub;
		JLabel name_label, press_label, load_label, temp_label, status_label, totalTime_label;
		JLabel press_val_label, noload_val_label, load_val_label, temp_val_label, status_val_label, totalTime_val_label;
		JLabel alarm_label, fault_label;
		JLabel close_label;

		DeviceInfo deviceInfo;
		int width, height;

		public PanelDevice(int width, int height, DeviceInfo deviceInfo) {
			this.width = width;
			this.height = height;

			this.deviceInfo = deviceInfo;
			setLayout(new GridLayout());
			setOpaque(false);
			add(main = new MyPanel());
			sub = new MyPanel();
			
			main.setLayout(new FlowLayout(0, 2, 2));
			main.setBorder(new LineBorder(MyColor.BLUE_20));
			sub.setBackground(MyColor.WHITE);

			main.add(name_label = new MyLabel("-호기 (Micos -)", 0, MyFont.Font_32, MyColor.DARK_BLUE));
			main.add(press_label = new MyLabel("압력", 0, MyFont.Font_32, Color.black));
			main.add(press_val_label = new MyLabel("0.0 bar", 0, MyFont.Font_32, Color.black));
			main.add(load_label = new MyLabel("무부하/부하", 0, MyFont.Font_24, Color.black));
			main.add(noload_val_label = new MyLabel("0.0 bar", 0, MyFont.Font_24, Color.black));
			main.add(load_val_label = new MyLabel("0.0 bar", 0, MyFont.Font_24, Color.black));
			main.add(temp_label = new MyLabel("온도", 0, MyFont.Font_32, Color.black));
			main.add(temp_val_label = new MyLabel("0.0 ℃", 0, MyFont.Font_32, Color.black));
			main.add(status_label = new MyLabel("로 컬", 0, MyFont.Font_32, Color.white));
			main.add(status_val_label = new MyLabel("부 하", 0, MyFont.Font_32, Color.white));
			main.add(alarm_label = new MyLabel("알 람", 0, MyFont.Font_32, Color.black));
			main.add(fault_label = new MyLabel("고 장", 0, MyFont.Font_32, Color.black));
			main.add(totalTime_label = new MyLabel("총 운전시간", 0, MyFont.Font_32, Color.black));
			main.add(totalTime_val_label = new MyLabel("0 hr", 0, MyFont.Font_32, Color.black));

			main.add(close_label = new JLabel(new ImageIcon()));
			close_label.setIcon(new ImageIcon(new ImageIcon(getClass().getResource("/images/close_color.png"))
					.getImage().getScaledInstance(200, 200, Image.SCALE_DEFAULT)));

			addMouseListener(new MouseListener() {

				@Override
				public void mouseReleased(MouseEvent e) {
					if (AppData.subForm == null || !AppData.subForm.isShowing()) {
						AppData.subForm = new FormSub();
						AppData.subForm.setVisible(true);
						AppData.mainForm.setVisible(false);
					} else {
						AppData.mainForm.setVisible(true);
						AppData.subForm.dispose();
					}
					// TODO Auto-generated method stub

				}

				@Override
				public void mousePressed(MouseEvent e) {
					// TODO Auto-generated method stub

				}

				@Override
				public void mouseExited(MouseEvent e) {
					// TODO Auto-generated method stub

				}

				@Override
				public void mouseEntered(MouseEvent e) {
					// TODO Auto-generated method stub

				}

				@Override
				public void mouseClicked(MouseEvent e) {
				}
			});

			main.setPreferredSize(new Dimension(width, height));
			main.setBounds(0, 0, width, height);
			sub.setPreferredSize(new Dimension(width, height));
			setPreferredSize(new Dimension(width, height));
			setSize(width, height);

			name_label.setPreferredSize(new Dimension(width, height / 6));

			press_label.setPreferredSize(new Dimension((int) (width * 0.3), height / 6));
			press_val_label.setPreferredSize(new Dimension((int) (width * 0.7), height / 6));

			load_label.setPreferredSize(new Dimension((int) (width * 0.4), height / 6));
			noload_val_label.setPreferredSize(new Dimension((int) (width * 0.3), height / 6));
			load_val_label.setPreferredSize(new Dimension((int) (width * 0.3), height / 6));

			temp_label.setPreferredSize(new Dimension((int) (width * 0.3), height / 6));
			temp_val_label.setPreferredSize(new Dimension((int) (width * 0.7), height / 6));

			status_label.setPreferredSize(new Dimension((int) (width * 0.5), height / 6));
			status_val_label.setPreferredSize(new Dimension((int) (width * 0.5), height / 6));

			totalTime_label.setPreferredSize(new Dimension((int) (width * 0.5), height / 6));
			totalTime_val_label.setPreferredSize(new Dimension((int) (width * 0.5), height / 6));

			close_label.setPreferredSize(new Dimension(width, height - (height / 6)));

			name_label.setBorder(new LineBorder(MyColor.BLUE_20));
			press_val_label.setBorder(new LineBorder(MyColor.BLUE_20));
			noload_val_label.setBorder(new LineBorder(MyColor.BLUE_20));
			load_val_label.setBorder(new LineBorder(MyColor.BLUE_20));
			temp_val_label.setBorder(new LineBorder(MyColor.BLUE_20));
			totalTime_val_label.setBorder(new LineBorder(MyColor.BLUE_20));

			press_label.setBackground(MyColor.BLUE_15);
			load_label.setBackground(MyColor.BLUE_10);
			temp_label.setBackground(MyColor.BLUE_15);
			status_label.setBackground(MyColor.GREEN);
			status_val_label.setBackground(MyColor.RED);
			totalTime_label.setBackground(MyColor.BLUE_15);
			alarm_label.setBackground(MyColor.YELLOW);
			fault_label.setBackground(MyColor.RED);

			name_label.setOpaque(true);
			press_label.setOpaque(true);
			load_label.setOpaque(true);
			temp_label.setOpaque(true);
			status_label.setOpaque(true);
			status_val_label.setOpaque(true);
			totalTime_label.setOpaque(true);
			alarm_label.setOpaque(true);
			fault_label.setOpaque(true);

			alarm_label.setVisible(false);
			fault_label.setVisible(false);
		}

		public void refresh() {
			if (deviceInfo.connected && AppData.is_connected) {
				press_label.setVisible(true);
				press_val_label.setVisible(true);
				load_label.setVisible(true);
				noload_val_label.setVisible(true);
				load_val_label.setVisible(true);
				temp_label.setVisible(true);
				temp_val_label.setVisible(true);
				status_label.setVisible(true);
				status_val_label.setVisible(true);
				totalTime_label.setVisible(true);
				totalTime_val_label.setVisible(true);

				close_label.setVisible(false);
				
				name_label.setBackground(MyColor.NAMES[deviceInfo.index]);
				name_label.setText(String.format("%d호기 (%s)", deviceInfo.index + 1, deviceInfo.type));
				if (deviceInfo.press >= 327) {
					press_val_label.setText("--- bar");
				} else {
					press_val_label.setText(String.format("%.1f bar", deviceInfo.press));
				}

				if (deviceInfo.is_inverter) {
					load_label.setText("제어압력/회전수");
					noload_val_label.setText(String.format("%.1f bar", deviceInfo.control_press));
					load_val_label.setText(String.format("%d rpm", deviceInfo.rpm));
				} else {
					load_label.setText("무부하/부하");
					noload_val_label.setText(String.format("%.1f bar", deviceInfo.noload));
					load_val_label.setText(String.format("%.1f bar", deviceInfo.load));
				}

				if (deviceInfo.temp >= 327) {
					temp_val_label.setText("--- ℃");
				} else {
					temp_val_label.setText(String.format("%.1f ℃", deviceInfo.temp));
				}

				totalTime_val_label.setText(String.format("%d hr", deviceInfo.totalTime));

				if (deviceInfo.mode == 0) {
					status_label.setText("로 컬");
				} else if (deviceInfo.mode == 1) {
					status_label.setText("리모트");
				} else if (deviceInfo.mode == 2) {
					status_label.setText("스케쥴");
				} else if (deviceInfo.mode == 3) {
					status_label.setText("스케쥴 대기");
				}

				if (deviceInfo.status == 0) {
					status_val_label.setText("정 지");
					status_val_label.setBackground(MyColor.STOP);
				} else if (deviceInfo.status == 1) {
					status_val_label.setText("자동 정지");
					status_val_label.setBackground(MyColor.AUTOSTOP);
				} else if (deviceInfo.status == 2 || deviceInfo.status == 3 || deviceInfo.status == 4) {
					status_val_label.setText("운전 시작");
					status_val_label.setBackground(MyColor.START);
				} else if (deviceInfo.status == 5) {
					status_val_label.setText("무 부 하");
					status_val_label.setBackground(MyColor.START);
				} else if (deviceInfo.status == 6) {
					status_val_label.setText("부 하");
					status_val_label.setBackground(MyColor.LOAD);
				} else if (deviceInfo.status == 7) {
					status_val_label.setText("정지 지연");
					status_val_label.setBackground(MyColor.EX);
				} else if (deviceInfo.status == 8) {
					status_val_label.setText("에어 배기");
					status_val_label.setBackground(MyColor.EX);
				}

				int alarm_width = width;
				int fault_width = width;

				if (deviceInfo.alarm) {
					fault_width = width / 2;
					alarm_label.setVisible(is_time500);
				} else {
					alarm_label.setVisible(false);
				}

				if (deviceInfo.fault) {
					alarm_width = width / 2;
					fault_label.setVisible(is_time500);
				} else {
					fault_label.setVisible(false);
				}

				alarm_label.setPreferredSize(new Dimension(alarm_width, height / 6));
				fault_label.setPreferredSize(new Dimension(fault_width, height / 6));
			} else {
				press_label.setVisible(false);
				press_val_label.setVisible(false);
				load_label.setVisible(false);
				noload_val_label.setVisible(false);
				load_val_label.setVisible(false);
				temp_label.setVisible(false);
				temp_val_label.setVisible(false);
				status_label.setVisible(false);
				status_val_label.setVisible(false);
				totalTime_label.setVisible(false);
				totalTime_val_label.setVisible(false);
				alarm_label.setVisible(false);
				fault_label.setVisible(false);

				close_label.setVisible(true);
			}

			setVisible(true);
		}
	}
}

