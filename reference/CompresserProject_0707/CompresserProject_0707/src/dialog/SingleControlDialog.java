package dialog;

import java.awt.Color;
import java.awt.Dimension;
import java.awt.FlowLayout;
import java.awt.GridLayout;
import java.awt.Image;
import java.awt.event.KeyEvent;
import java.awt.event.KeyListener;
import java.awt.event.MouseEvent;
import java.awt.event.MouseListener;
import java.text.SimpleDateFormat;
import java.util.Date;

import javax.swing.ImageIcon;
import javax.swing.JDialog;
import javax.swing.JFrame;
import javax.swing.JLabel;
import javax.swing.JPanel;
import javax.swing.JScrollPane;
import javax.swing.JTextField;
import javax.swing.border.LineBorder;

import border.RoundedBorder;
import model.ControlModel_00;
import model.DeviceInfo;
import model.InjectionModel;
import model.MyModel;
import model.OilModel;
import utill.AppData;
import utill.MyColor;
import utill.MyFont;
import utill.MyLabel;
import utill.MyPanel;
import utill.MyTextField;

public class SingleControlDialog extends JDialog{
	JPanel top_panel, main_panel;
	
	JPanel category_panel, content_panel;
	
	JPanel setting_panel, status_panel, error_panel, log_panel;
	JPanel setting_label_panel, setting_control_panel;
	
	JScrollPane status_jsp;
	JPanel status_label_panel;
	
	JLabel error_title, error_content_label, error_time_label;
	JScrollPane error_jsp;
	JPanel error_label_panel;

	JLabel error_label[] = new JLabel[255];
	JLabel error_time[] = new JLabel[255];
	
	JLabel category_setting_label, category_status_label, category_error_label, category_log_label; 
	
	JLabel press_label, control_press_label, press_control_label, time_label;
	JLabel yd_label, device_num_label, run_mode_label, model_label, first_label, version_label;
	
	JTextField press_val_label, control_press_val_label, press_control_val_label, time_val_label;
	JLabel press_sign_label, control_press_sign_label, press_control_sign_label, time_sign_label;
	JPanel press_panel, control_press_panel, press_control_panel, time_panel;

	JTextField yd_val_label, device_num_val_label, run_mode_val_label, model_val_label, first_val_label, version_val_label;
	JLabel yd_sign_label, device_num_sign_label, run_mode_sign_label, model_sign_label, first_sign_label, version_sign_label;
	JPanel yd_panel, device_num_panel, run_mode_panel, model_panel, first_panel, version_panel;

	JLabel device_set_label, run_label;
	JLabel device_set_val_label, run_val_label;
	
	JLabel status_label[] = new JLabel[255];
	JLabel status_val[] = new JLabel[255];
	JLabel status_sign[] = new JLabel[255];
	
	String status_str[] = {"총 운전 시간","모델","모터 기동 횟수","장비번호",
			"부하 운전 시간","무부하 압력","무부하 운전 시간","부하 압력",
			"자동 정지 시간","자동정지 시간","정지 시간","메뉴얼 무부하",
			"에어필터 사용 시간(2000)","팬 가동 온도", "오일필터 사용 시간(3000)","팬 정지 온도",
			"세퍼레이터 사용 시간(3000)","부하 운전 온도","오일 사용 시간(3000)","오일 알람 온도","구리스 사용 시간(2000)","오일 과온 정지 온도","","Fan on/off 운전"};

	String status_str_oil[] = {
			"서비스 압력","에어필터 교환시간 설정값","에어필터 차압","오일필터 교환시간 설정값","2단 흡입 압력",
			"오일 교환시간 설정값","오일 압력","그리스 교환시간 설정값","서비스 온도","에어필터 사용시간",
			"1단 토출 온도","오일필터 사용시간","2단 흡입 온도","오일 사용시간","2단 토출 온도",
			"그리스 사용시간","오일 온도","부하 시간","","무부하 시간",
			"","자동 정지 시간","","정지 시간","",
			"총 운전시간","","운전횟수"
	};
	
	String status_str_sign[] = {
			"hr","37","nu","nu",
			"hr","bar","hr","bar",
			"hr","min","hr","",
			"hr","℃","hr","℃",
			"hr","℃","hr","℃",
			"hr","℃","",""
	};
	
	String status_str_sign_oil[] = {
			"bar","hr","mbar","hr","bar","hr","bar","hr","℃","hr","℃","hr","℃","hr","℃","hr","℃","hr","","hr","","hr","","hr","","hr","","nu"
	};
	JLabel cancel_label;
	
	short align_val = -1;
	short local_mode_val = -1;
	short single_mode_val = -1;
	DeviceInfo deviceInfo;

	
	public SingleControlDialog(DeviceInfo deviceInfo) {
		this.deviceInfo = deviceInfo;
		setLayout(new FlowLayout(1,0,0));

		setUndecorated(true);
		setDefaultCloseOperation(javax.swing.WindowConstants.HIDE_ON_CLOSE);
		setBackground(new Color(0f,0f,0f,0.6f));
		
		add(top_panel = new JPanel(new FlowLayout(0,0,0)));
		add(main_panel = new JPanel(new FlowLayout(0,0,0)));
		
		top_panel.setOpaque(false);
		main_panel.setBackground(MyColor.WHITE);
		main_panel.setOpaque(true);

		main_panel.add(category_panel = new MyPanel(new FlowLayout(1,0,0)));
		main_panel.add(content_panel = new MyPanel(new FlowLayout(0,0,0)));
		
		category_panel.add(category_setting_label = new MyLabel("SETTING", 0, MyFont.Font_24, MyColor.WHITE));
		category_panel.add(category_status_label = new MyLabel("STATUS", 0, MyFont.Font_24, MyColor.DARK_BLUE));
		category_panel.add(category_error_label = new MyLabel("ERROR", 0, MyFont.Font_24, MyColor.DARK_BLUE));
		category_panel.add(category_log_label = new MyLabel("LOG TABLE", 0, MyFont.Font_24, MyColor.DARK_BLUE));
		
		category_log_label.setVisible(false);
		
		MouseListener category_listener = new MouseListener() {
			@Override
			public void mouseReleased(MouseEvent e) {
				if(e.getSource() == category_setting_label) {
					category_setting_label.setBackground(MyColor.BLUE);
					category_status_label.setBackground(MyColor.WHITE);
					category_error_label.setBackground(MyColor.WHITE);
					category_log_label.setBackground(MyColor.WHITE);
					
					category_setting_label.setForeground(MyColor.WHITE);
					category_status_label.setForeground(MyColor.DARK_BLUE);
					category_error_label.setForeground(MyColor.DARK_BLUE);
					category_log_label.setForeground(MyColor.DARK_BLUE);

					setting_panel.setVisible(true);
					status_panel.setVisible(false);
					error_panel.setVisible(false);
					
				}else if(e.getSource() == category_status_label) {
					category_setting_label.setBackground(MyColor.WHITE);
					category_status_label.setBackground(MyColor.BLUE);
					category_error_label.setBackground(MyColor.WHITE);
					category_log_label.setBackground(MyColor.WHITE);
					
					category_setting_label.setForeground(MyColor.DARK_BLUE);
					category_status_label.setForeground(MyColor.WHITE);
					category_error_label.setForeground(MyColor.DARK_BLUE);
					category_log_label.setForeground(MyColor.DARK_BLUE);
					
					setting_panel.setVisible(false);
					status_panel.setVisible(true);
					error_panel.setVisible(false);
				}else if(e.getSource() == category_error_label) {
					category_setting_label.setBackground(MyColor.WHITE);
					category_status_label.setBackground(MyColor.WHITE);
					category_error_label.setBackground(MyColor.BLUE);
					category_log_label.setBackground(MyColor.WHITE);
					
					category_setting_label.setForeground(MyColor.DARK_BLUE);
					category_status_label.setForeground(MyColor.DARK_BLUE);
					category_error_label.setForeground(MyColor.WHITE);
					category_log_label.setForeground(MyColor.DARK_BLUE);
					setting_panel.setVisible(false);
					status_panel.setVisible(false);
					error_panel.setVisible(true);
				}else if(e.getSource() == category_log_label) {
					category_setting_label.setBackground(MyColor.WHITE);
					category_status_label.setBackground(MyColor.WHITE);
					category_error_label.setBackground(MyColor.WHITE);
					category_log_label.setBackground(MyColor.BLUE);
					
					category_setting_label.setForeground(MyColor.DARK_BLUE);
					category_status_label.setForeground(MyColor.DARK_BLUE);
					category_error_label.setForeground(MyColor.DARK_BLUE);
					category_log_label.setForeground(MyColor.WHITE);
				}
			}
			@Override
			public void mousePressed(MouseEvent e) {
			}
			@Override
			public void mouseExited(MouseEvent e) {
			}
			@Override
			public void mouseEntered(MouseEvent e) {
			}
			@Override
			public void mouseClicked(MouseEvent e) {
			}
		};
		
		category_setting_label.addMouseListener(category_listener);
		category_status_label.addMouseListener(category_listener);
		category_error_label.addMouseListener(category_listener);
		category_log_label.addMouseListener(category_listener);

		KeyListener key_listener = new KeyListener() {
			@Override
			public void keyTyped(KeyEvent e) {
			}
			@Override
			public void keyReleased(KeyEvent e) {
	            if(e.getKeyCode() != KeyEvent.VK_ENTER) return;

	    		if(device_model instanceof InjectionModel) {
	    			InjectionModel model = (InjectionModel) device_model;
    				int id = (deviceInfo.index + 0x11) << 8;
	    			if(model.MODEL_1 == 2) { // 인버터
			            if(e.getSource() == press_val_label) {
			            	AppData.socket.sendMap((short)(id+32), (short) (Float.parseFloat(press_val_label.getText())*10.0f));
			            }else if(e.getSource() == control_press_val_label) {
			            	AppData.socket.sendMap((short)(id+34), (short) (Float.parseFloat(control_press_val_label.getText())*10.0f));
			            }else if(e.getSource() == press_control_val_label) {
			            	AppData.socket.sendMap((short)(id+36), (short) (Float.parseFloat(press_control_val_label.getText())*10.0f));
			            }else if(e.getSource() == time_val_label) {
			            	AppData.socket.sendMap((short)(id+42), Short.parseShort(time_val_label.getText()));
			            }
	    			}else {
			            if(e.getSource() == press_val_label) {
			            	AppData.socket.sendMap((short)(id+30), (short) (Float.parseFloat(press_val_label.getText())*10.0f));
			            }else if(e.getSource() == control_press_val_label) {
			            	AppData.socket.sendMap((short)(id+38), (short) (Float.parseFloat(control_press_val_label.getText())*10.0f));
			            }else if(e.getSource() == press_control_val_label) {
			            	AppData.socket.sendMap((short)(id+40), (short) (Float.parseFloat(press_control_val_label.getText())*10.0f));
			            }else if(e.getSource() == time_val_label) {
			            	AppData.socket.sendMap((short)(id+42), Short.parseShort(time_val_label.getText()));
			            }
	    			}
	    		}else if(device_model instanceof OilModel) {
	    			OilModel model = (OilModel) device_model;
    				int id = (deviceInfo.index + 0x11) << 8;
    				if (AppData.getModelOil(model.mMODEL_1+"", model.mVERSION_1+"", model.mVERSION_2+"").indexOf("V") != -1) {
			            if(e.getSource() == press_val_label) {
			            	AppData.socket.sendMap((short)(id+70), (short) (Float.parseFloat(press_val_label.getText())*10.0f));
			            }else if(e.getSource() == control_press_val_label) {
			            	AppData.socket.sendMap((short)(id+72), (short) (Float.parseFloat(control_press_val_label.getText())*10.0f));
			            }else if(e.getSource() == press_control_val_label) {
			            	AppData.socket.sendMap((short)(id+74), (short) (Float.parseFloat(press_control_val_label.getText())*10.0f));
			            }else if(e.getSource() == time_val_label) {
			            	AppData.socket.sendMap((short)(id+82), Short.parseShort(time_val_label.getText()));
			            }
	    			}else {
			            if(e.getSource() == press_val_label) {
			            	AppData.socket.sendMap((short)(id+76), (short) (Float.parseFloat(press_val_label.getText())*10.0f));
			            }else if(e.getSource() == control_press_val_label) {
			            	AppData.socket.sendMap((short)(id+78), (short) (Float.parseFloat(control_press_val_label.getText())*10.0f));
			            }else if(e.getSource() == press_control_val_label) {
			            	AppData.socket.sendMap((short)(id+80), (short) (Float.parseFloat(press_control_val_label.getText())*10.0f));
			            }else if(e.getSource() == time_val_label) {
			            	AppData.socket.sendMap((short)(id+82), Short.parseShort(time_val_label.getText()));
			            }
	    			}
	    		}
			}
			@Override
			public void keyPressed(KeyEvent e) {
			}
		};
		
		content_panel.add(setting_panel = new JPanel(new FlowLayout(0,0,0)));
		content_panel.add(status_panel = new JPanel(new GridLayout()));
		content_panel.add(error_panel = new JPanel(new FlowLayout(0,0,0)));
		
		setting_panel.add(setting_label_panel = new MyPanel(new FlowLayout(0,2,2))); 
		setting_panel.add(setting_control_panel = new MyPanel(new FlowLayout(0,2,2))); 
		
		setting_label_panel.add(press_label = new MyLabel("제어 압력 설정",0, MyFont.Font_24, Color.BLACK));
		setting_label_panel.add(control_press_label = new MyLabel("상세 제어 압력 설정",0, MyFont.Font_24, Color.BLACK));
		
		setting_label_panel.add(press_panel = new MyPanel(new FlowLayout(0,0,0)));
		press_panel.add(press_val_label = new MyTextField("0.0",0, MyFont.Font_24, MyColor.BLUE));
		press_panel.add(press_sign_label = new MyLabel("bar",0, MyFont.Font_24, MyColor.BLUE));
		press_val_label.addKeyListener(key_listener);

		setting_label_panel.add(control_press_panel = new MyPanel(new FlowLayout(0,0,0)));
		control_press_panel.add(control_press_val_label = new MyTextField("0.0",0, MyFont.Font_24, MyColor.BLUE));
		control_press_panel.add(control_press_sign_label = new MyLabel("bar",0, MyFont.Font_24, MyColor.BLUE));
		control_press_val_label.addKeyListener(key_listener);
		
		setting_label_panel.add(press_control_label = new MyLabel("압력 제어 설정",0, MyFont.Font_24, Color.BLACK));
		setting_label_panel.add(time_label = new MyLabel("자동 정지 시간 설정",0, MyFont.Font_24, Color.BLACK));

		setting_label_panel.add(press_control_panel = new MyPanel(new FlowLayout(0,0,0)));
		press_control_panel.add(press_control_val_label = new MyTextField("0.0",0, MyFont.Font_24, MyColor.BLUE));
		press_control_panel.add(press_control_sign_label = new MyLabel("bar",0, MyFont.Font_24, MyColor.BLUE));
		press_control_val_label.addKeyListener(key_listener);

		setting_label_panel.add(time_panel = new MyPanel(new FlowLayout(0,0,0)));
		time_panel.add(time_val_label = new MyTextField("0.0",0, MyFont.Font_24, MyColor.BLUE));
		time_panel.add(time_sign_label = new MyLabel("min",0, MyFont.Font_24, MyColor.BLUE));
		time_val_label.addKeyListener(key_listener);
		
		setting_label_panel.add(yd_label = new MyLabel("Y-D 변환시간",0, MyFont.Font_24, Color.BLACK));
		setting_label_panel.add(device_num_label = new MyLabel("장비번호",0, MyFont.Font_24, Color.BLACK));
		
		setting_label_panel.add(yd_panel = new MyPanel(new FlowLayout(0,0,0)));
		yd_panel.add(yd_val_label = new MyTextField("0",0, MyFont.Font_24, MyColor.BLUE));
		yd_panel.add(yd_sign_label = new MyLabel("sec",0, MyFont.Font_24, MyColor.BLUE));
		yd_val_label.addKeyListener(key_listener);

		setting_label_panel.add(device_num_panel = new MyPanel(new FlowLayout(0,0,0)));
		device_num_panel.add(device_num_val_label = new MyTextField("0",0, MyFont.Font_24, MyColor.BLUE));
		device_num_panel.add(device_num_sign_label = new MyLabel("nu",0, MyFont.Font_24, MyColor.BLUE));
		device_num_val_label.addKeyListener(key_listener);
		
		setting_label_panel.add(run_mode_label = new MyLabel("운전모드",0, MyFont.Font_24, Color.BLACK));
		setting_label_panel.add(model_label = new MyLabel("모델",0, MyFont.Font_24, Color.BLACK));
		
		setting_label_panel.add(run_mode_panel = new MyPanel(new FlowLayout(0,0,0)));
		run_mode_panel.add(run_mode_val_label = new MyTextField("",0, MyFont.Font_24, MyColor.BLUE));
		run_mode_panel.add(run_mode_sign_label = new MyLabel("",0, MyFont.Font_24, MyColor.BLUE));
		run_mode_val_label.addKeyListener(key_listener);

		setting_label_panel.add(model_panel = new MyPanel(new FlowLayout(0,0,0)));
		model_panel.add(model_val_label = new MyTextField("",0, MyFont.Font_24, MyColor.BLUE));
		model_panel.add(model_sign_label = new MyLabel("",0, MyFont.Font_24, MyColor.BLUE));
		model_val_label.addKeyListener(key_listener);
		
		setting_label_panel.add(first_label = new MyLabel("초기 오일 순환시간",0, MyFont.Font_24, Color.BLACK));
		setting_label_panel.add(version_label = new MyLabel("버전",0, MyFont.Font_24, Color.BLACK));
		
		setting_label_panel.add(first_panel = new MyPanel(new FlowLayout(0,0,0)));
		first_panel.add(first_val_label = new MyTextField("0",0, MyFont.Font_24, MyColor.BLUE));
		first_panel.add(first_sign_label = new MyLabel("sec",0, MyFont.Font_24, MyColor.BLUE));
		first_val_label.addKeyListener(key_listener);

		setting_label_panel.add(version_panel = new MyPanel(new FlowLayout(0,0,0)));
		version_panel.add(version_val_label = new MyTextField("",0, MyFont.Font_24, MyColor.BLUE));
		version_panel.add(version_sign_label = new MyLabel("",0, MyFont.Font_24, MyColor.BLUE));
		version_val_label.addKeyListener(key_listener);
		
		setting_control_panel.add(device_set_label = new MyLabel("정비 장비 설정 / 해제",0, MyFont.Font_24, MyColor.DARK_BLUE));
		setting_control_panel.add(device_set_val_label = new MyLabel("정비 장비 설정",0, MyFont.Font_24, MyColor.WHITE));
		setting_control_panel.add(run_label = new MyLabel("OPERATE / STOP BUTTON",0, MyFont.Font_24, MyColor.DARK_BLUE));
		setting_control_panel.add(run_val_label = new MyLabel("운   전",0, MyFont.Font_24, MyColor.WHITE));
		
		device_set_val_label.addMouseListener(new MouseListener() {
			@Override
			public void mouseReleased(MouseEvent e) {
				MaintenanceDialog maintenanceDialog = new MaintenanceDialog(deviceInfo.index);
				maintenanceDialog.show();
			}
			@Override
			public void mousePressed(MouseEvent e) {
			}
			@Override
			public void mouseExited(MouseEvent e) {
			}
			@Override
			public void mouseEntered(MouseEvent e) {
			}
			@Override
			public void mouseClicked(MouseEvent e) {
			}
		});
		
		run_val_label.addMouseListener(new MouseListener() {
			@Override
			public void mouseReleased(MouseEvent e) {
				if(deviceInfo.status == 0) {
					int id = (deviceInfo.index + 0x11) << 8;
					if(deviceInfo.category == AppData.CATEGORY_INJECTION) {
						AppData.socket.sendMap((short)(id+26), (short)(0x02));	
					}else if(deviceInfo.category == AppData.CATEGORY_OIL) {
						AppData.socket.sendMap((short)(id+68), (short)(0x02));				
					}		
				}else {
					SingleStopDialog singleStopDialog = new SingleStopDialog(deviceInfo);
					singleStopDialog.show();
				}					
			}
			@Override
			public void mousePressed(MouseEvent e) {
			}
			@Override
			public void mouseExited(MouseEvent e) {
			}
			@Override
			public void mouseEntered(MouseEvent e) {
			}
			@Override
			public void mouseClicked(MouseEvent e) {
			}
		});
		
		status_panel.add(status_jsp = new JScrollPane(status_label_panel = new MyPanel(new FlowLayout(0,2,2))));
		status_jsp.getVerticalScrollBar().setUnitIncrement(16);
		status_jsp.setOpaque(false);
		status_jsp.setBorder(null);
		status_jsp.getViewport().setOpaque(false);
		status_jsp.setVerticalScrollBarPolicy(JScrollPane.VERTICAL_SCROLLBAR_ALWAYS);
		status_jsp.setHorizontalScrollBarPolicy(JScrollPane.HORIZONTAL_SCROLLBAR_NEVER);
		
		int i=0;
		if(deviceInfo.category == AppData.CATEGORY_INJECTION) {
			
			yd_label.setVisible(false);
			device_num_label.setVisible(false);
			run_mode_label.setVisible(false);
			model_label.setVisible(false);
			first_label.setVisible(false);
			version_label.setVisible(false);
			yd_val_label.setVisible(false);
			device_num_val_label.setVisible(false);
			run_mode_val_label.setVisible(false);
			model_val_label.setVisible(false);
			first_val_label.setVisible(false);
			version_val_label.setVisible(false);
			yd_sign_label.setVisible(false);
			device_num_sign_label.setVisible(false);
			run_mode_sign_label.setVisible(false);
			model_sign_label.setVisible(false);
			first_sign_label.setVisible(false);
			version_sign_label.setVisible(false);
			
			while(i<status_str.length) {
				status_label_panel.add(status_label[i] = new MyLabel(status_str[i], 0, MyFont.Font_24, MyColor.BLACK));
				status_label_panel.add(status_label[i+1] = new MyLabel(status_str[i+1], 0, MyFont.Font_24, MyColor.BLACK));
				
				status_label_panel.add(status_val[i] = new MyLabel("", 0, MyFont.Font_24, MyColor.BLUE));
				status_label_panel.add(status_sign[i] = new MyLabel(status_str_sign[i], 0, MyFont.Font_24, MyColor.BLUE));
				
				status_label_panel.add(status_val[i+1] = new MyLabel("", 0, MyFont.Font_24, MyColor.BLUE));
				status_label_panel.add(status_sign[i+1] = new MyLabel(status_str_sign[i+1], 0, MyFont.Font_24, MyColor.BLUE));
				i+=2;
			}
			
			for(i=0; i<status_str.length; i++) {
				status_label[i].setBackground(MyColor.BLUE_10);
				status_label[i].setOpaque(true);
				
				status_val[i].setBorder(new LineBorder(MyColor.BLUE_10, 1));
				status_sign[i].setBorder(new LineBorder(MyColor.BLUE_10, 1));
				
				status_label[i].setPreferredSize(new Dimension(setting_width/2, label_height));
				status_val[i].setPreferredSize(new Dimension((int) ((setting_width/2) * 0.7), val_height));
				status_sign[i].setPreferredSize(new Dimension((int) ((setting_width/2) * 0.3), val_height));
			}	
		}else if(deviceInfo.category == AppData.CATEGORY_OIL) {
			
			while(i<status_str_oil.length) {
				status_label_panel.add(status_label[i] = new MyLabel(status_str_oil[i], 0, MyFont.Font_24, MyColor.BLACK));
				status_label_panel.add(status_label[i+1] = new MyLabel(status_str_oil[i+1], 0, MyFont.Font_24, MyColor.BLACK));
				
				status_label_panel.add(status_val[i] = new MyLabel("", 0, MyFont.Font_24, MyColor.BLUE));
				status_label_panel.add(status_sign[i] = new MyLabel(status_str_sign_oil[i], 0, MyFont.Font_24, MyColor.BLUE));
				
				status_label_panel.add(status_val[i+1] = new MyLabel("", 0, MyFont.Font_24, MyColor.BLUE));
				status_label_panel.add(status_sign[i+1] = new MyLabel(status_str_sign_oil[i+1], 0, MyFont.Font_24, MyColor.BLUE));
				i+=2;
			}
			
			for(i=0; i<status_str_oil.length; i++) {
				status_label[i].setBackground(MyColor.BLUE_10);
				status_label[i].setOpaque(true);
				
				status_val[i].setBorder(new LineBorder(MyColor.BLUE_10, 1));
				status_sign[i].setBorder(new LineBorder(MyColor.BLUE_10, 1));
				
				status_label[i].setPreferredSize(new Dimension(setting_width/2, label_height));
				status_val[i].setPreferredSize(new Dimension((int) ((setting_width/2) * 0.7), val_height));
				status_sign[i].setPreferredSize(new Dimension((int) ((setting_width/2) * 0.3), val_height));
			}
		}
		
		error_panel.add(error_title = new MyLabel("ERROR "+ (deviceInfo.index+1) +"호기", 0, MyFont.Font_24, MyColor.BLUE));
		error_panel.add(error_content_label = new MyLabel("내용", 0, MyFont.Font_24, MyColor.WHITE));
		error_panel.add(error_time_label = new MyLabel("시간", 0, MyFont.Font_24, MyColor.WHITE));
		error_content_label.setBackground(MyColor.BLUE);
		error_time_label.setBackground(MyColor.BLUE);
		error_content_label.setOpaque(true);
		error_time_label.setOpaque(true);
		
		error_panel.add(error_jsp = new JScrollPane(error_label_panel = new MyPanel(new FlowLayout(0,0,0))));
		error_jsp.setOpaque(false);
		error_jsp.setBorder(null);
		error_jsp.getViewport().setOpaque(false);
		error_jsp.setVerticalScrollBarPolicy(JScrollPane.VERTICAL_SCROLLBAR_ALWAYS);
		error_jsp.setHorizontalScrollBarPolicy(JScrollPane.HORIZONTAL_SCROLLBAR_NEVER);
		
		main_panel.add(cancel_label = new MyLabel("닫기",0, MyFont.Font_24, Color.WHITE));
		
		cancel_label.setBackground(MyColor.BLUE);
		cancel_label.setOpaque(true);
		cancel_label.addMouseListener(new MouseListener() {
			@Override
			public void mouseReleased(MouseEvent e) {
				dispose();
			}
			@Override
			public void mousePressed(MouseEvent e) {
			}
			@Override
			public void mouseExited(MouseEvent e) {
			}
			@Override
			public void mouseEntered(MouseEvent e) {
			}
			@Override
			public void mouseClicked(MouseEvent e) {
			}
		});
				
		setting_panel.setBackground(Color.white);
		status_panel.setBackground(Color.white);
		error_panel.setBackground(Color.white);

		setting_panel.setOpaque(true);
		status_panel.setOpaque(true);
		error_panel.setOpaque(true);
		
		category_setting_label.setBackground(MyColor.BLUE);
		category_status_label.setBackground(Color.white);
		category_error_label.setBackground(Color.white);
		category_log_label.setBackground(Color.white);
		category_setting_label.setOpaque(true);
		category_status_label.setOpaque(true);
		category_error_label.setOpaque(true);
		category_log_label.setOpaque(true);

		press_label.setBackground(MyColor.BLUE_10);
		press_control_label.setBackground(MyColor.BLUE_10);
		control_press_label.setBackground(MyColor.BLUE_10);
		time_label.setBackground(MyColor.BLUE_10);
		
		yd_label.setBackground(MyColor.GRAY);
		device_num_label.setBackground(MyColor.GRAY);
		run_mode_label.setBackground(MyColor.GRAY);
		model_label.setBackground(MyColor.GRAY);
		first_label.setBackground(MyColor.GRAY);
		version_label.setBackground(MyColor.GRAY);
		
		device_set_val_label.setBackground(MyColor.BLUE);
		run_val_label.setBackground(MyColor.BLUE);
		
		press_label.setOpaque(true);
		press_control_label.setOpaque(true);
		control_press_label.setOpaque(true);
		time_label.setOpaque(true);
		yd_label.setOpaque(true);
		device_num_label.setOpaque(true);
		run_mode_label.setOpaque(true);
		model_label.setOpaque(true);
		first_label.setOpaque(true);
		version_label.setOpaque(true);
		
		device_set_val_label.setOpaque(true);
		run_val_label.setOpaque(true);
		
		press_val_label.setBorder(new LineBorder(MyColor.BLUE_10, 1));
		press_control_val_label.setBorder(new LineBorder(MyColor.BLUE_10, 1));
		control_press_val_label.setBorder(new LineBorder(MyColor.BLUE_10, 1));
		time_val_label.setBorder(new LineBorder(MyColor.BLUE_10, 1));
		
		yd_val_label.setEnabled(false);
		device_num_val_label.setEnabled(false);
		run_mode_val_label.setEnabled(false);
		model_val_label.setEnabled(false);
		first_val_label.setEnabled(false);
		version_val_label.setEnabled(false);

		yd_sign_label.setEnabled(false);
		device_num_sign_label.setEnabled(false);
		run_mode_sign_label.setEnabled(false);
		model_sign_label.setEnabled(false);
		first_sign_label.setEnabled(false);
		version_sign_label.setEnabled(false);
		
		yd_val_label.setBorder(new LineBorder(MyColor.GRAY, 1));
		device_num_val_label.setBorder(new LineBorder(MyColor.GRAY, 1));
		run_mode_val_label.setBorder(new LineBorder(MyColor.GRAY, 1));
		model_val_label.setBorder(new LineBorder(MyColor.GRAY, 1));
		first_val_label.setBorder(new LineBorder(MyColor.GRAY, 1));
		version_val_label.setBorder(new LineBorder(MyColor.GRAY, 1));

		press_sign_label.setBorder(new LineBorder(MyColor.BLUE_10, 1));
		press_control_sign_label.setBorder(new LineBorder(MyColor.BLUE_10, 1));
		control_press_sign_label.setBorder(new LineBorder(MyColor.BLUE_10, 1));
		time_sign_label.setBorder(new LineBorder(MyColor.BLUE_10, 1));
		
		yd_sign_label.setBorder(new LineBorder(MyColor.GRAY, 1));
		device_num_sign_label.setBorder(new LineBorder(MyColor.GRAY, 1));
		run_mode_sign_label.setBorder(new LineBorder(MyColor.GRAY, 1));
		model_sign_label.setBorder(new LineBorder(MyColor.GRAY, 1));
		first_sign_label.setBorder(new LineBorder(MyColor.GRAY, 1));
		version_sign_label.setBorder(new LineBorder(MyColor.GRAY, 1));
		
		run_label.setBorder(new LineBorder(Color.black, 2));
		device_set_label.setBorder(new LineBorder(Color.black, 2));

		category_panel.setPreferredSize(new Dimension(main_width, category_height));
		content_panel.setPreferredSize(new Dimension(main_width, content_height));
		
		category_setting_label.setPreferredSize(new Dimension(category_width/4, category_height));
		category_status_label.setPreferredSize(new Dimension(category_width/4, category_height));
		category_error_label.setPreferredSize(new Dimension(category_width/4, category_height));
		category_log_label.setPreferredSize(new Dimension(category_width/4, category_height));
		
		setting_panel.setPreferredSize(new Dimension(main_width, content_height));
		status_panel.setPreferredSize(new Dimension(main_width, content_height));
		error_panel.setPreferredSize(new Dimension(main_width, content_height));
		
		cancel_label.setPreferredSize(new Dimension(main_width, cancel_height));
		
		setting_label_panel.setPreferredSize(new Dimension(main_width, content_height-setting_control_height));
		setting_control_panel.setPreferredSize(new Dimension(main_width, setting_control_height));
		
		press_label.setPreferredSize(new Dimension(setting_width/2, label_height));
		press_control_label.setPreferredSize(new Dimension(setting_width/2, label_height));
		control_press_label.setPreferredSize(new Dimension(setting_width/2, label_height));
		time_label.setPreferredSize(new Dimension(setting_width/2, label_height));

		yd_label.setPreferredSize(new Dimension(setting_width/2, label_height));
		device_num_label.setPreferredSize(new Dimension(setting_width/2, label_height));
		run_mode_label.setPreferredSize(new Dimension(setting_width/2, label_height));
		model_label.setPreferredSize(new Dimension(setting_width/2, label_height));
		first_label.setPreferredSize(new Dimension(setting_width/2, label_height));
		version_label.setPreferredSize(new Dimension(setting_width/2, label_height));
		
		press_val_label.setPreferredSize(new Dimension((int) ((setting_width/2) * 0.7), val_height));
		control_press_val_label.setPreferredSize(new Dimension((int) ((setting_width/2) * 0.7), val_height));
		press_control_val_label.setPreferredSize(new Dimension((int) ((setting_width/2) * 0.7), val_height));
		time_val_label.setPreferredSize(new Dimension((int) ((setting_width/2) * 0.7), val_height));
		
		yd_val_label.setPreferredSize(new Dimension((int) ((setting_width/2) * 0.7), val_height));
		device_num_val_label.setPreferredSize(new Dimension((int) ((setting_width/2) * 0.7), val_height));
		run_mode_val_label.setPreferredSize(new Dimension((int) ((setting_width/2) * 0.7), val_height));
		model_val_label.setPreferredSize(new Dimension((int) ((setting_width/2) * 0.7), val_height));
		first_val_label.setPreferredSize(new Dimension((int) ((setting_width/2) * 0.7), val_height));
		version_val_label.setPreferredSize(new Dimension((int) ((setting_width/2) * 0.7), val_height));
		
		press_sign_label.setPreferredSize(new Dimension((int) ((setting_width/2) * 0.3), val_height));
		control_press_sign_label.setPreferredSize(new Dimension((int) ((setting_width/2) * 0.3), val_height));
		press_control_sign_label.setPreferredSize(new Dimension((int) ((setting_width/2) * 0.3), val_height));
		time_sign_label.setPreferredSize(new Dimension((int) ((setting_width/2) * 0.3), val_height));

		yd_sign_label.setPreferredSize(new Dimension((int) ((setting_width/2) * 0.3), val_height));
		device_num_sign_label.setPreferredSize(new Dimension((int) ((setting_width/2) * 0.3), val_height));
		run_mode_sign_label.setPreferredSize(new Dimension((int) ((setting_width/2) * 0.3), val_height));
		model_sign_label.setPreferredSize(new Dimension((int) ((setting_width/2) * 0.3), val_height));
		first_sign_label.setPreferredSize(new Dimension((int) ((setting_width/2) * 0.3), val_height));
		version_sign_label.setPreferredSize(new Dimension((int) ((setting_width/2) * 0.3), val_height));
		
		device_set_label.setPreferredSize(new Dimension(setting_width/2, 70));
		run_label.setPreferredSize(new Dimension(setting_width/2, 70));
		device_set_val_label.setPreferredSize(new Dimension(setting_width/2, 70));
		run_val_label.setPreferredSize(new Dimension(setting_width/2, 70));
		
		status_jsp.setPreferredSize(new Dimension(main_width, content_height+600));
		status_label_panel.setPreferredSize(new Dimension(main_width, content_height+600));
		
		error_title.setPreferredSize(new Dimension(main_width, cancel_height));
		error_content_label.setPreferredSize(new Dimension((int)(main_width*0.7), cancel_height-20));
		error_time_label.setPreferredSize(new Dimension((int)(main_width*0.3), cancel_height-20));
		
		error_jsp.setPreferredSize(new Dimension(main_width, content_height+450));
		error_label_panel.setPreferredSize(new Dimension(main_width, content_height+450));

		top_panel.setPreferredSize(new Dimension(width, 100));
		main_panel.setPreferredSize(new Dimension(main_width,main_height));
		main_panel.setBounds(0,0,main_width,main_height);

		setPreferredSize(new Dimension(width,height));
		setBounds(0,0,width,height);

		status_panel.setVisible(false);
		error_panel.setVisible(false);

		for(int j=1; j<255; j++) {
			addError(j);
		}
		
		setLocationRelativeTo(null);

		Thread UiThread = new Thread(new Runnable() {
			@Override
			public void run() {
				try {
					while(true) {
						refresh();
						Thread.sleep(50);
					}
				} catch (Exception e) {
					e.printStackTrace();
				}		
			}
		});
		UiThread.setDaemon(true);
		UiThread.start();
		refresh_one();
	}

	int width = 1920;
	int height = 1080;
	int main_width = 800;
	int main_height = 900;
	int category_width = main_width - 200;
	int category_height = 80;
	int content_height = 750;
	int setting_width = main_width - 10;
	int setting_control_height = 150;
	
	int label_height = 40;
	int val_height = 50;
	int save_width = 70;
	
	int cancel_height = 70;
	
	boolean error_list[] = new boolean[255];
	
	void addError(int code) {
		String str="";
		if(deviceInfo.category == AppData.CATEGORY_INJECTION) {
			if(code == 0x01) {
				str = "메인모터 과부하 정지";
			}
			if(code == 0x02) {
				str = "팬모터 과부하 정지";
			}
			if(code == 0x03) {
				str = "오일온도 과온 정지";
			}
			if(code == 0x04) {
				str = "온도센서 연결 이상";
			}
			if(code == 0x05) {
				str = "압력센서 연결 이상";
			}
			if(code == 0x06) {
				str = "압력 과압축 정지";
			}
			if(code == 0x07) {
				str = "워터플로어 스위치 이상 정지";
			}
			if(code == 0x08) {
				str = "운전확인신호 이상";
			}
		}else if(deviceInfo.category == AppData.CATEGORY_OIL) {
			if(code == 1) str = "P1 - 서비스 압력센서 이상";
			else if(code == 2) str = "펌프 모타 운전신호 이상";
			else if(code == 3) str = "P3 - 2단 흡입 압력 센서 연결이상";
			else if(code == 4) str = "P4 - 오일 압력센서 연결이상";
			else if(code == 5) str = "T1 - 서비스 온도센서 연결이상";
			else if(code == 6) str = "T2 - 1단 토출온도센서 연결이상";
			else if(code == 7) str = "T3 - 2단 흡입온도센서 연결이상";
			else if(code == 8) str = "T4 - 2단 토출온도센서 연결이상";
			else if(code == 9) str = "T5 - 오일 온도센서 이상";
			else if(code == 10) str = "메인모터 과부하";
			else if(code == 11) str = "팬모터 과부하";
			else if(code == 12) str = "펌프모터 과부하. 이상";
			else if(code == 13) str = "P1 - 서비스 압력 과압축";
			else if(code == 14) str = "P3 - 2단 흡입압력 과압축";
			else if(code == 15) str = "T2 - 1단 토출온도 과온";
			else if(code == 16) str = "T4 - 2단 토출온도 과온";
			else if(code == 17) str = "T5 - 오일온도 과온";
			else if(code == 18) str = "P4 - 오일압력 이상";
			else if(code == 19) str = "냉각수 흐름 이상";
			else if(code == 20) str = "인버터 통신에러";
			else if(code == 21) str = "비상정지 스위치 ON";
			else if(code == 22) str = "2단 흡입온도 과온";
		}
		error_label_panel.add(error_label[code] = new MyLabel(str, 0, MyFont.Font_18, MyColor.BLACK));
		error_label_panel.add(error_time[code] = new MyLabel(new SimpleDateFormat("yy/MM/dd HH:mm:ss").format(new Date()), 0, MyFont.Font_18, MyColor.BLACK));
		error_label[code].setBorder(new LineBorder(MyColor.BLUE_10, 1));
		error_time[code].setBorder(new LineBorder(MyColor.BLUE_10, 1));
		error_label[code].setPreferredSize(new Dimension((int)(main_width*0.7), cancel_height-20));
		error_time[code].setPreferredSize(new Dimension((int)(main_width*0.3), cancel_height-20));
		error_label[code].setVisible(false);
		error_time[code].setVisible(false);
	}
	
	void setError(int code, boolean flag) {
		if(!error_list[code]) {
			if(flag) {
				error_time[code].setText(new SimpleDateFormat("yy/MM/dd HH:mm:ss").format(new Date()));
				System.out.println("ERROR 추가");
			}
		}
		
		error_label[code].setVisible(flag);
		error_time[code].setVisible(flag);
		error_list[code] = flag;
	}
	
	
	MyModel device_model;
	
	void refresh() {
		device_model = AppData.deviceModel[deviceInfo.index];
		if(deviceInfo.status == 0x00) {
			run_val_label.setText("운   전");
		}else {
			run_val_label.setText("정   지");
		}
		
		if(device_model instanceof InjectionModel) {
			InjectionModel model = (InjectionModel) device_model;
			setError(1, (model.FAULT_FLG & 0x01) == 0x01);
			setError(2, (model.FAULT_FLG & 0x02) == 0x02);
			setError(3, (model.FAULT_FLG & 0x04) == 0x04);
			setError(4, (model.FAULT_FLG & 0x08) == 0x08);
			setError(5, (model.FAULT_FLG & 0x10) == 0x10);
			setError(6, (model.FAULT_FLG & 0x20) == 0x20);
			setError(7, (model.FAULT_FLG & 0x40) == 0x40);
			setError(8, (model.FAULT_FLG & 0x80) == 0x80);
			
			if(model.MODEL_1 == 2) { // 인버터
				status_val[0].setText(String.format("%d", Integer.parseInt(model.TOTAL_RUN_TIME_H + "" + model.TOTAL_RUN_TIME_L)));
				status_val[1].setText("Micos");
				status_sign[1].setText(AppData.getModelName(model.MODEL_2).replace("Micos ",""));

				status_val[2].setText(String.format("%d", Integer.parseInt(model.TOTAL_RUN_COUNT_H + "" + model.TOTAL_RUN_COUNT_L)));
				status_val[3].setText(String.format("%d", model.SYSTEM_ID));
				status_val[4].setText(String.format("%d", model.TOTAL_LOAD_TIME));
				

				status_label[5].setText("제어 압력");
				status_val[5].setText(String.format("%.1f", model.INV_TARGET_PRESSURE / 10.0f));
				status_val[6].setText(String.format("%d", model.TOTAL_UNLOAD_TIME));
				
				status_label[7].setText("상세 제어 압력");
				status_val[7].setText(String.format("%.1f", model.INV_INDIRECT_PRESSURE / 10.0f));
				status_val[8].setText(String.format("%d", model.TOTAL_AUTOSTOP_TIME));
				
				status_label[9].setText("압력 제어");
				status_val[9].setText(String.format("%.1f", model.INV_DIRECT_PRESSURE / 10.0f));
				status_sign[9].setText("bar");
				
				status_val[10].setText(String.format("%d", model.TOTAL_STOP_TIME));

				status_label[11].setText("자동 정지시간");
				status_val[11].setText(String.format("%d", model.AUTO_STOP_TIME));
				status_sign[11].setText("min");

				status_val[12].setText(String.format("%d", model.TOTAL_AIR_FILT_TIME));
				status_label[12].setText(String.format("에어필터 사용 시간(%d)", model.AIRFILTER_USETIME));
				status_val[13].setText(String.format("%d", model.FAN_ON_TEMP));
				
				status_val[14].setText(String.format("%d", model.TOTAL_OIL_FILT_TIME));
				status_label[14].setText(String.format("오일필터 사용 시간(%d)", model.OILFILTER_USETIME));
				status_val[15].setText(String.format("%d", model.FAN_OFF_TEMP));
				
				status_val[16].setText(String.format("%d", model.TOTAL_SEPARATOR_TIME));
				status_label[16].setText(String.format("세퍼레이터 사용 시간(%d)", model.SEPARATOR_USETIME));
				status_val[17].setText(String.format("%d", model.LOAD_TEMP));
				
				status_val[18].setText(String.format("%d", model.TOTAL_OIL_TIME));
				status_label[18].setText(String.format("오일 사용 시간(%d)", model.OIL_USETIME));
				status_val[19].setText(String.format("%d", model.TEMP_ALARM_TEMP));
				
				status_val[20].setText(String.format("%d", model.TOTAL_GREES_TIME));
				status_label[20].setText(String.format("구리스 사용 시간(%d)", model.GREES_USETIME));
				status_val[21].setText(String.format("%d", model.TEMP_FAULT_TEMP));
				
				status_val[22].setText("");
				if(model.FAN_ONOFF_MODE == 0) status_val[23].setText("OFF");
				else if(model.FAN_ONOFF_MODE == 1) status_val[23].setText("ON");
			}else {
				status_val[0].setText(String.format("%d", Integer.parseInt(model.TOTAL_RUN_TIME_H + "" + model.TOTAL_RUN_TIME_L)));
				status_val[1].setText("Micos");
				status_sign[1].setText(AppData.getModelName(model.MODEL_2).replace("Micos ",""));
				status_val[2].setText(String.format("%d", Integer.parseInt(model.TOTAL_RUN_COUNT_H + "" + model.TOTAL_RUN_COUNT_L)));
				status_val[3].setText(String.format("%d", model.SYSTEM_ID));
				status_val[4].setText(String.format("%d", model.TOTAL_LOAD_TIME));
				status_val[5].setText(String.format("%.1f", model.UNLOAD_PRESSURE / 10.0f));
				status_val[6].setText(String.format("%d", model.TOTAL_UNLOAD_TIME));
				status_val[7].setText(String.format("%.1f", model.LOAD_PRESSURE / 10.0f));
				status_val[8].setText(String.format("%d", model.TOTAL_AUTOSTOP_TIME));
				status_val[9].setText(String.format("%d", model.AUTO_STOP_TIME));
				status_val[10].setText(String.format("%d", model.TOTAL_STOP_TIME));

				if(model.MANUAL_UNLOAD_MODE == 0) status_val[11].setText("OFF");
				else if(model.MANUAL_UNLOAD_MODE == 1) status_val[11].setText("ON");
				
				status_val[12].setText(String.format("%d", model.TOTAL_AIR_FILT_TIME));
				status_label[12].setText(String.format("에어필터 사용 시간(%d)", model.AIRFILTER_USETIME));
				status_val[13].setText(String.format("%d", model.FAN_ON_TEMP));
				
				status_val[14].setText(String.format("%d", model.TOTAL_OIL_FILT_TIME));
				status_label[14].setText(String.format("오일필터 사용 시간(%d)", model.OILFILTER_USETIME));
				status_val[15].setText(String.format("%d", model.FAN_OFF_TEMP));
				
				status_val[16].setText(String.format("%d", model.TOTAL_SEPARATOR_TIME));
				status_label[16].setText(String.format("세퍼레이터 사용 시간(%d)", model.SEPARATOR_USETIME));
				status_val[17].setText(String.format("%d", model.LOAD_TEMP));
				
				status_val[18].setText(String.format("%d", model.TOTAL_OIL_TIME));
				status_label[18].setText(String.format("오일 사용 시간(%d)", model.OIL_USETIME));
				status_val[19].setText(String.format("%d", model.TEMP_ALARM_TEMP));
				
				status_val[20].setText(String.format("%d", model.TOTAL_GREES_TIME));
				status_label[20].setText(String.format("구리스 사용 시간(%d)", model.GREES_USETIME));
				status_val[21].setText(String.format("%d", model.TEMP_FAULT_TEMP));
				
				status_val[22].setText("");
				if(model.FAN_ONOFF_MODE == 0) status_val[23].setText("OFF");
				else if(model.FAN_ONOFF_MODE == 1) status_val[23].setText("ON");
			}
			
			setColor(12, (model.ALARM & 0x01) == 0x01);
			setColor(14, (model.ALARM & 0x02) == 0x02);
			setColor(16, (model.ALARM & 0x04) == 0x04);
			setColor(18, (model.ALARM & 0x08) == 0x08);
			setColor(20, (model.ALARM & 0x20) == 0x20);
			setColor(21, (model.ALARM & 0x10) == 0x10);
		}else {
			OilModel model = (OilModel) device_model;
			setError(1, (model.mFAULT_FLG_L & 0x01) == 0x01);
			setError(2, (model.mFAULT_FLG_L & 0x02) == 0x02);
			setError(3, (model.mFAULT_FLG_L & 0x04) == 0x04);
			setError(4, (model.mFAULT_FLG_L & 0x08) == 0x08);
			setError(5, (model.mFAULT_FLG_L & 0x10) == 0x10);
			setError(6, (model.mFAULT_FLG_L & 0x20) == 0x20);
			setError(7, (model.mFAULT_FLG_L & 0x40) == 0x40);
			setError(8, (model.mFAULT_FLG_L & 0x80) == 0x80);
			
			setError(9, (model.mFAULT_FLG_L & 0x100) == 0x100);
			setError(10, (model.mFAULT_FLG_L & 0x200) == 0x200);
			setError(11, (model.mFAULT_FLG_L & 0x400) == 0x400);
			setError(12, (model.mFAULT_FLG_L & 0x800) == 0x800);
			setError(13, (model.mFAULT_FLG_L & 0x1000) == 0x1000);
			setError(14, (model.mFAULT_FLG_L & 0x2000) == 0x2000);
			setError(15, (model.mFAULT_FLG_L & 0x4000) == 0x4000);
			setError(16, (model.mFAULT_FLG_L & 0x8000) == 0x8000);
			
			setError(17, (model.mFAULT_FLG_H & 0x01) == 0x01);
			setError(18, (model.mFAULT_FLG_H & 0x02) == 0x02);
			setError(19, (model.mFAULT_FLG_H & 0x04) == 0x04);
			setError(20, (model.mFAULT_FLG_H & 0x08) == 0x08);
			setError(21, (model.mFAULT_FLG_H & 0x10) == 0x10);
			setError(22, (model.mFAULT_FLG_H & 0x20) == 0x20);
			
			
			
			if(model.P1 >= 0x7FFF) status_val[0].setText("---");
			else status_val[0].setText(String.format("%.1f", model.P1 / 100.0f));
				
			status_val[1].setText(String.format("%d", model.mAIRFILTER_USE_LIMIT));
			
			if(model.P2 >= 0x7FFF) status_val[2].setText("---");
			else status_val[2].setText(String.format("%d", model.P2)); //bit (4 | 9)
			
			status_val[3].setText(String.format("%d", model.mOILFILTER_USE_LIMIT));
			
			if(model.P3 >= 0x7FFF) status_val[4].setText("---");
			else status_val[4].setText(String.format("%.1f", model.P3 / 100.0f)); //bit (14)
			
			status_val[5].setText(String.format("%d", model.mOIL_USE_LIMIT));
			
			if(model.P4 >= 0x7FFF) status_val[6].setText("---");
			else status_val[6].setText(String.format("%.1f", model.P4 / 100.0f));//bit (12) 
			
			status_val[7].setText(String.format("%d", model.mGRESS_USE_LIMIT));
			
			if(model.T1 >= 0x7FFF) status_val[8].setText("---");
			else status_val[8].setText(String.format("%d", model.T1));
			
			status_val[9].setText(String.format("%d", model.mTOTAL_AIR_FILT_TIME));//bit (0)
			
			if(model.T2 >= 0x7FFF) status_val[10].setText("---");
			else status_val[10].setText(String.format("%d", model.T2));//bit (5)
			
			status_val[11].setText(String.format("%d", model.mTOTAL_OIL_FILT_TIME));//bit (1)
			
			if(model.T3 >= 0x7FFF) status_val[12].setText("---");
			else status_val[12].setText(String.format("%d", model.T3));
			
			
			status_val[13].setText(String.format("%d", model.mTOTAL_OIL_TIME));//bit (2)
			
			if(model.T4 >= 0x7FFF) status_val[14].setText("---");
			else status_val[14].setText(String.format("%d", model.T4));//bit (6)
			
			status_val[15].setText(String.format("%d", model.mTOTAL_GRESS_TIME));//bit (3)
			
			if(model.T5 >= 0x7FFF) status_val[16].setText("---");
			else status_val[16].setText(String.format("%d", model.T5));//bit (7|10)
			
			
			status_val[17].setText(String.format("%d", model.mTOTAL_LOAD_TIME));
//			status_val[18].setText(String.format("%d", model.T10));
			status_val[19].setText(String.format("%d", model.mTOTAL_UNLOAD_TIME));
//			status_val[20].setText(String.format("%d", model.T11));
			status_val[21].setText(String.format("%d", model.mTOTAL_AUTOSTOP_TIME));
//			status_val[22].setText(String.format("%d", model.T12));
			status_val[23].setText(String.format("%d", model.mTOTAL_STOP_TIME));
//			status_val[24].setText(String.format("%d", model.T13));
			status_val[25].setText((model.mTOTAL_RUN_TIME_H << 8 | model.mTOTAL_RUN_TIME_L)+"");
//			status_val[26].setText(String.format("%d", model.T14));
			status_val[27].setText((model.mTOTAL_RUN_COUNT_H << 8 | model.mTOTAL_RUN_COUNT_L)+"");

			setColor(2, (model.mALARM_FLAG & 0x10) == 0x10 || (model.mALARM_FLAG & 0x200) == 0x200);
			setColor(4, (model.mALARM_FLAG & 0x4000) == 0x4000);
			setColor(6, (model.mALARM_FLAG & 0x1000) == 0x1000);
			setColor(9, (model.mALARM_FLAG & 0x01) == 0x01);
			setColor(10, (model.mALARM_FLAG & 0x20) == 0x20);
			setColor(11, (model.mALARM_FLAG & 0x02) == 0x02);
			setColor(13, (model.mALARM_FLAG & 0x04) == 0x04);
			setColor(14, (model.mALARM_FLAG & 0x40) == 0x40);
			setColor(15, (model.mALARM_FLAG & 0x08) == 0x08);
			setColor(16, (model.mALARM_FLAG & 0x80) == 0x80 || (model.mALARM_FLAG & 0x400) == 0x400);
		}
	}

	void refresh_one() {
		device_model = AppData.deviceModel[deviceInfo.index];
		
		if(device_model instanceof InjectionModel) {
			InjectionModel model = (InjectionModel) device_model;
			if(model.MODEL_1 == 2) { // 인버터
				press_val_label.setText(String.format("%.1f", model.INV_TARGET_PRESSURE/ 10.0)); //32	
				
				control_press_val_label.setText(String.format("%.1f", model.INV_INDIRECT_PRESSURE/ 10.0)); //34

				press_control_val_label.setText(String.format("%.1f", model.INV_DIRECT_PRESSURE/ 10.0)); //36
				
				time_val_label.setText(String.format("%d", model.AUTO_STOP_TIME)); //42
			}else {
				press_label.setText("비상 정지 압력");
				press_val_label.setText(String.format("%.1f", model.EMER_STOP_PRESSURE / 10.0f)); //30
				
				control_press_label.setText("무부하 압력");
				control_press_val_label.setText(String.format("%.1f", model.UNLOAD_PRESSURE/ 10.0f)); //38
				
				press_control_label.setText("부하 압력");
				press_control_val_label.setText(String.format("%.1f", model.LOAD_PRESSURE/ 10.0f)); //40
				
				time_label.setText("자동 정지 시간");
				time_val_label.setText(String.format("%d", model.AUTO_STOP_TIME)); //42
			}
		}else if(device_model instanceof OilModel) {
			OilModel model = (OilModel) device_model;
			if (AppData.getModelOil(model.mMODEL_1+"", model.mVERSION_1+"", model.mVERSION_2+"").indexOf("V") != -1) {
				press_val_label.setText(String.format("%.1f", model.mINV_TargetP/ 10.0)); //32

				control_press_val_label.setText(String.format("%.1f", model.mINV_InDirectP/ 10.0)); //34

				press_control_val_label.setText(String.format("%.1f", model.mINV_DirectP/ 10.0)); //36
				
				time_val_label.setText(String.format("%d", model.mAUTO_STOP_MIN)); //42
			}else {
				press_label.setText("비상 정지 압력");
				press_val_label.setText(String.format("%.1f", model.mEMER_STOP_P / 10.0f)); //30
				
				control_press_label.setText("무부하 압력");
				control_press_val_label.setText(String.format("%.1f", model.mUNLOAD_P/ 10.0f)); //38
				
				press_control_label.setText("부하 압력");
				press_control_val_label.setText(String.format("%.1f", model.mLOAD_P/ 10.0f)); //40
				
				time_label.setText("자동 정지 시간");
				time_val_label.setText(String.format("%d", model.mAUTO_STOP_MIN)); //42
			}
			
			yd_val_label.setText(model.mYD_CONVERSION_SEC+"");
			device_num_val_label.setText(model.mSYSTEM_ID+"");
			if(model.mDRIVE_SET_MODE == 0) {
				run_mode_val_label.setText("로컬");	
			}else if(model.mDRIVE_SET_MODE == 1) {
				run_mode_val_label.setText("리모트");
			}else if(model.mDRIVE_SET_MODE == 2) {
				run_mode_val_label.setText("스케쥴");
			}
			
			model_val_label.setText(AppData.getModelOil(model.mMODEL_1+"", model.mVERSION_1+"", model.mVERSION_2+"").replace("Micos ",""));
			first_val_label.setText(model.mOIL_START_SEC+"");
			version_val_label.setText(AppData.getVersionOil(model.mVERSION_1+"", model.mVERSION_2+"", model.mVERSION_NUM+""));
		}
	}
	
	public void setColor(int i, boolean flag) {
		if(flag) {
			status_label[i].setBackground(MyColor.RED);
			status_label[i].setOpaque(true);
			
			status_val[i].setBorder(new LineBorder(MyColor.RED, 1));
			status_val[i].setForeground(MyColor.RED);
			
			status_sign[i].setBorder(new LineBorder(MyColor.RED, 1));
			status_sign[i].setForeground(MyColor.RED);
		}else {
			status_label[i].setBackground(MyColor.BLUE_10);
			status_label[i].setOpaque(true);
			
			status_val[i].setBorder(new LineBorder(MyColor.BLUE_10, 1));
			status_sign[i].setBorder(new LineBorder(MyColor.BLUE_10, 1));
		}
	}
	
}
