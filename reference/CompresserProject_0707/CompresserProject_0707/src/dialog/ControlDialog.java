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

import javax.swing.ImageIcon;
import javax.swing.JCheckBox;
import javax.swing.JDialog;
import javax.swing.JFrame;
import javax.swing.JLabel;
import javax.swing.JPanel;
import javax.swing.JScrollPane;
import javax.swing.JTextField;
import javax.swing.border.LineBorder;

import border.RoundedBorder;
import model.ControlModel_00;
import model.InjectionModel;
import model.OilModel;
import model.OtherModel_04;
import utill.AppData;
import utill.MyColor;
import utill.MyFont;
import utill.MyLabel;
import utill.MyPanel;
import utill.MyTextField;

public class ControlDialog extends JDialog{
	JPanel top_panel, main_panel;
	JPanel control_panel, setting_panel, run_panel;
	JLabel unload_label, load_label, press_label, low_label, time_label, unit_label;
	
	JPanel unload_panel, load_panel, press_panel, low_panel, time_panel, unit_panel;
	JTextField unload_val_label, load_val_label, press_val_label, low_val_label, time_val_label, unit_val_label;
	JLabel unload_sign_label, load_sign_label, press_sign_label, low_sign_label, time_sign_label, unit_sign_label;

	JPanel set_align_panel, time_align_panel, eco_panel;
	
	JLabel device_label, device_save_button;
	JTextField device_val_label;
	JLabel press_set_label, press_save_button;
	JTextField press_set_val_label;
	
	JPanel local_mode_panel, remote_mode_panel;
	JPanel single_mode_panel, multi_mode_panel;
	
	JCheckBox eco_checkbox;
	JLabel align_label, set_align_label, time_align_label, eco_label, ailgn_save_button;
	JLabel mode_label, local_mode_label, remote_mode_label, local_mode_save_button;
	JLabel mode2_label, single_mode_label, multi_mode_label, single_mode_save_button;
	
	JLabel run_label, run_button, stop_button;
	
	JLabel cancel_label;
	
	short align_val = 0;
	short local_mode_val = -1;
	short single_mode_val = -1;
	
	public ControlDialog() {
		setLayout(new FlowLayout(1,0,0));

		setUndecorated(true);
		setAlwaysOnTop(true);
		setDefaultCloseOperation(javax.swing.WindowConstants.HIDE_ON_CLOSE);
		setBackground(new Color(0f,0f,0f,0.6f));
		
		add(top_panel = new JPanel(new FlowLayout(0,0,0)));
		add(main_panel = new JPanel(new FlowLayout(0,0,0)));
		
		top_panel.setOpaque(false);
		main_panel.add(control_panel = new JPanel(new FlowLayout(0,2,2)));
		main_panel.add(setting_panel = new JPanel(new FlowLayout(0,2,10)));
		main_panel.add(run_panel = new JPanel(new FlowLayout(0,5,10)));
		
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
		
		control_panel.add(unload_label = new MyLabel("무부하 압력",0, MyFont.Font_24, Color.BLACK));
		control_panel.add(load_label = new MyLabel("부하 압력",0, MyFont.Font_24, Color.BLACK));
		control_panel.add(press_label = new MyLabel("장비별 압력차",0, MyFont.Font_24, Color.BLACK));
		
		control_panel.add(unload_panel = new MyPanel(new FlowLayout(0,0,0)));
		unload_panel.add(unload_val_label = new MyTextField("0.0",0, MyFont.Font_24, MyColor.BLUE));
		unload_panel.add(unload_sign_label = new MyLabel("bar",0, MyFont.Font_24, MyColor.BLUE));

		control_panel.add(load_panel = new MyPanel(new FlowLayout(0,0,0)));
		load_panel.add(load_val_label = new MyTextField("0.0",0, MyFont.Font_24, MyColor.BLUE));
		load_panel.add(load_sign_label = new MyLabel("bar",0, MyFont.Font_24, MyColor.BLUE));

		control_panel.add(press_panel = new MyPanel(new FlowLayout(0,0,0)));
		press_panel.add(press_val_label = new MyTextField("0.0",0, MyFont.Font_24, MyColor.BLUE));
		press_panel.add(press_sign_label = new MyLabel("bar",0, MyFont.Font_24, MyColor.BLUE));

		control_panel.add(low_label = new MyLabel("저압경보 압력 설정",0, MyFont.Font_24, Color.BLACK));
		control_panel.add(time_label = new MyLabel("교환 운전 시간",0, MyFont.Font_24, Color.BLACK));
		control_panel.add(unit_label = new MyLabel("가동 대수",0, MyFont.Font_24, Color.BLACK));

		control_panel.add(low_panel = new MyPanel(new FlowLayout(0,0,0)));
		low_panel.add(low_val_label = new MyTextField("0",0, MyFont.Font_24, MyColor.BLUE));
		low_panel.add(low_sign_label = new MyLabel("bar",0, MyFont.Font_24, MyColor.BLUE));
		
		control_panel.add(time_panel = new MyPanel(new FlowLayout(0,0,0)));
		time_panel.add(time_val_label = new MyTextField("0",0, MyFont.Font_24, MyColor.BLUE));
		time_panel.add(time_sign_label = new MyLabel("hr",0, MyFont.Font_24, MyColor.BLUE));
		
		control_panel.add(unit_panel = new MyPanel(new FlowLayout(0,0,0)));
		unit_panel.add(unit_val_label = new MyTextField("0",0, MyFont.Font_24, MyColor.BLUE));
		unit_panel.add(unit_sign_label = new MyLabel("ea",0, MyFont.Font_24, MyColor.BLUE));
		
		setting_panel.add(align_label = new MyLabel("정렬 설정",0, MyFont.Font_24, MyColor.DARK_BLUE));
		
		setting_panel.add(set_align_panel = new JPanel(new GridLayout()));
		set_align_panel.add(set_align_label = new MyLabel("설정순",0, MyFont.Font_24, MyColor.DARK_BLUE));
		setting_panel.add(time_align_panel = new JPanel(new GridLayout()));
		time_align_panel.add(time_align_label = new MyLabel("시간순",0, MyFont.Font_24, MyColor.DARK_BLUE));
		setting_panel.add(eco_panel = new JPanel(new FlowLayout(0,0,0)));
		eco_panel.add(eco_checkbox = new JCheckBox(""));
		eco_panel.add(eco_label = new MyLabel("인버터 컨트롤\n에너지 절약모드",0, MyFont.Font_14, MyColor.DARK_BLUE));
		setting_panel.add(ailgn_save_button = new MyLabel("저장",0, MyFont.Font_24, Color.white));

		setting_panel.add(device_label = new MyLabel("인버터 메인 호기",0, MyFont.Font_24, MyColor.BLACK));
		setting_panel.add(device_val_label = new MyTextField("0",0, MyFont.Font_24, MyColor.DARK_BLUE));
		setting_panel.add(device_save_button = new MyLabel("저장",0, MyFont.Font_24, Color.white));
		
		setting_panel.add(press_set_label = new MyLabel("인버터 제어압력 설정",0, MyFont.Font_24, MyColor.BLACK));
		setting_panel.add(press_set_val_label = new MyTextField("0.0",0, MyFont.Font_24, MyColor.DARK_BLUE));
		setting_panel.add(press_save_button = new MyLabel("저장",0, MyFont.Font_24, Color.white));

		device_val_label.setText(String.format("%d", AppData.otherModel_04.MAIN_INVERTER_DEVICE));
		press_set_val_label.setText(String.format("%.1f", AppData.otherModel_04.INV_PLUSMINUS/10.0f));
		
		setting_panel.add(mode_label = new MyLabel("운전 모드 설정(로컬 / 리모트)",0, MyFont.Font_24, MyColor.DARK_BLUE));
		setting_panel.add(local_mode_panel = new JPanel(new GridLayout()));
		local_mode_panel.add(local_mode_label = new MyLabel("LOCAL",0, MyFont.Font_24, MyColor.DARK_BLUE));
		setting_panel.add(remote_mode_panel = new JPanel(new GridLayout()));
		remote_mode_panel.add(remote_mode_label = new MyLabel("REMOTE",0, MyFont.Font_24, MyColor.DARK_BLUE));
		setting_panel.add(local_mode_save_button = new MyLabel("저장",0, MyFont.Font_24, Color.white));

		setting_panel.add(mode2_label = new MyLabel("운전 모드 설정(개별 / 통합)",0, MyFont.Font_24, MyColor.DARK_BLUE));
		setting_panel.add(single_mode_panel = new JPanel(new GridLayout()));
		single_mode_panel.add(single_mode_label = new MyLabel("개별 운전",0, MyFont.Font_24, MyColor.DARK_BLUE));
		setting_panel.add(multi_mode_panel = new JPanel(new GridLayout()));
		multi_mode_panel.add(multi_mode_label = new MyLabel("통합 운전",0, MyFont.Font_24, MyColor.DARK_BLUE));
		setting_panel.add(single_mode_save_button = new MyLabel("저장",0, MyFont.Font_24, Color.white));

		run_panel.add(run_label = new MyLabel("통합운전 운전 / 정지 버튼",0, MyFont.Font_24, MyColor.DARK_BLUE));
		run_panel.add(run_button = new MyLabel("운전",0, MyFont.Font_32, Color.white));
		run_panel.add(stop_button = new MyLabel("정지",0, MyFont.Font_32, Color.white));
		
		// ========================================== 정렬 =====================================
		MouseListener align_listener = new MouseListener() {
			@Override
			public void mouseReleased(MouseEvent e) {
				if(e.getSource() == set_align_panel){
					align_val = 0;
					set_align_panel.setBorder(new RoundedBorder(MyColor.BLUE, 10));
					set_align_label.setForeground(Color.white);
					
					time_align_panel.setBorder(new RoundedBorder(Color.white, 10, MyColor.BLUE));
					time_align_label.setForeground(MyColor.BLUE);	
				}else {
					align_val = 1;
					set_align_panel.setBorder(new RoundedBorder(Color.white, 10, MyColor.BLUE));
					set_align_label.setForeground(MyColor.BLUE);	
					
					time_align_panel.setBorder(new RoundedBorder(MyColor.BLUE, 10));
					time_align_label.setForeground(Color.white);
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
		
		set_align_panel.addMouseListener(align_listener);
		time_align_panel.addMouseListener(align_listener);
		
		ailgn_save_button.addMouseListener(new MouseListener() {
			@Override
			public void mouseReleased(MouseEvent e) {
				new Thread(new Runnable() {
					@Override
					public void run() {		
						try {
							short val = align_val;
							Thread.sleep(500);
							if(eco_checkbox.isSelected()) {
								val = (short) (val | 0x100);
							}
							if((AppData.controlModel_00.TOTAL_RUN_STOP_L_R & 0x01) == 0x01) {
								is_refresh = true;
								AppData.showErrorToast("통합 운전중에는 데이터를 변경할 수 없습니다.");
								return;
							}
							AppData.socket.sendAlign(val);
						} catch (InterruptedException e) {
							e.printStackTrace();
						}
					}
				}).start();
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
		// ========================================== 로컬 =====================================
		
		MouseListener local_mode_listener = new MouseListener() {
			@Override
			public void mouseReleased(MouseEvent e) {
				if(e.getSource() == local_mode_panel){
					local_mode_val = 0;
					local_mode_panel.setBorder(new RoundedBorder(MyColor.BLUE, 10));
					local_mode_label.setForeground(Color.white);
					
					remote_mode_panel.setBorder(new RoundedBorder(Color.white, 10, MyColor.BLUE));
					remote_mode_label.setForeground(MyColor.BLUE);	
				}else {
					local_mode_val = 1;
					local_mode_panel.setBorder(new RoundedBorder(Color.white, 10, MyColor.BLUE));
					local_mode_label.setForeground(MyColor.BLUE);	
					
					remote_mode_panel.setBorder(new RoundedBorder(MyColor.BLUE, 10));
					remote_mode_label.setForeground(Color.white);
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
		
		local_mode_panel.addMouseListener(local_mode_listener);
		remote_mode_panel.addMouseListener(local_mode_listener);
		
		
		local_mode_save_button.addMouseListener(new MouseListener() {
			@Override
			public void mouseReleased(MouseEvent e) {
				if((AppData.controlModel_00.TOTAL_RUN_STOP_L_R & 0x01) == 0x01) {
					is_refresh = true;
					AppData.showErrorToast("통합 운전중에는 데이터를 변경할 수 없습니다.");
					return;
				}
				if(local_mode_val != -1) AppData.socket.sendLocalMode(local_mode_val);
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
		
		// ========================================== 개별 =====================================
		MouseListener single_mode_listener = new MouseListener() {
			@Override
			public void mouseReleased(MouseEvent e) {
				if(e.getSource() == single_mode_panel){
					single_mode_val = 0;
					single_mode_panel.setBorder(new RoundedBorder(MyColor.BLUE, 10));
					single_mode_label.setForeground(Color.white);
					
					multi_mode_panel.setBorder(new RoundedBorder(Color.white, 10, MyColor.BLUE));
					multi_mode_label.setForeground(MyColor.BLUE);	
					
				}else {
					single_mode_val = 1;
					single_mode_panel.setBorder(new RoundedBorder(Color.white, 10, MyColor.BLUE));
					single_mode_label.setForeground(MyColor.BLUE);	
					
					multi_mode_panel.setBorder(new RoundedBorder(MyColor.BLUE, 10));
					multi_mode_label.setForeground(Color.white);
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
		
		single_mode_panel.addMouseListener(single_mode_listener);
		multi_mode_panel.addMouseListener(single_mode_listener);
		
		single_mode_save_button.addMouseListener(new MouseListener() {
			@Override
			public void mouseReleased(MouseEvent e) {
				if((AppData.controlModel_00.TOTAL_RUN_STOP_L_R & 0x01) == 0x01) {
					is_refresh = true;
					AppData.showErrorToast("통합 운전중에는 데이터를 변경할 수 없습니다.");
					return;
				}
				if(single_mode_val != -1) AppData.socket.sendSingleMode(single_mode_val);
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
		
		KeyListener control_listener = new KeyListener() {
			@Override
			public void keyTyped(KeyEvent e) {
			}
			@Override
			public void keyReleased(KeyEvent e) {
	            if(e.getKeyCode() != KeyEvent.VK_ENTER) return;
	            String str = "";

				if((AppData.controlModel_00.TOTAL_RUN_STOP_L_R & 0x01) == 0x01) {
					is_refresh = true;
					AppData.showErrorToast("통합 운전중에는 데이터를 변경할 수 없습니다.");
					return;
				}
				
				if(e.getSource() == unload_val_label) {
					str = unload_val_label.getText().toString();
					if(!AppData.isFloat(str)) return;
					AppData.socket.sendControlUnload((short) (Float.parseFloat(str)*10f));
				}else if(e.getSource() == load_val_label) {
					str = load_val_label.getText().toString();
					if(!AppData.isFloat(str)) return;
					AppData.socket.sendControlLoad((short) (Float.parseFloat(str)*10f));
					
				}else if(e.getSource() == press_val_label) {
					str = press_val_label.getText().toString();
					if(!AppData.isFloat(str)) return;
					AppData.socket.sendControlPress((short) (Float.parseFloat(str)*10f));
					
				}else if(e.getSource() == low_val_label) {
					str = low_val_label.getText().toString();
					if(!AppData.isFloat(str)) return;
					AppData.socket.sendControlLow((short) (Float.parseFloat(str)*10f));
					
				}else if(e.getSource() == time_val_label) {
					str = time_val_label.getText().toString();
					if(!AppData.isFloat(str)) return;
					AppData.socket.sendControlTime((short) Integer.parseInt(str));
					
				}else if(e.getSource() == unit_val_label) {
					str = unit_val_label.getText().toString();
					if(!AppData.isFloat(str)) return;
					AppData.socket.sendControlUnit((short) Integer.parseInt(str));
				}
			}
			@Override
			public void keyPressed(KeyEvent e) {
			}
		};
		unload_val_label.addKeyListener(control_listener);
		load_val_label.addKeyListener(control_listener);
//		press_val_label.addKeyListener(control_listener);
		low_val_label.addKeyListener(control_listener);
		time_val_label.addKeyListener(control_listener);
		unit_val_label.addKeyListener(control_listener);
		
		press_val_label.addMouseListener(new MouseListener() {
			
			@Override
			public void mouseReleased(MouseEvent e) {
				DevicePressDialog devicePressDialog = new DevicePressDialog();
				devicePressDialog.show();
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
		
		

		MouseListener run_listener = new MouseListener() {
			
			@Override
			public void mouseReleased(MouseEvent e) {
				if(e.getSource() == run_button) {
					if((AppData.controlModel_00.TOTAL_RUN_STOP_L_R & 0x01) == 0x01) {
						is_refresh = true;
						AppData.showErrorToast("통합 운전중에는 데이터를 변경할 수 없습니다.");
						return;
					}
					AppData.socket.sendRun((short) 1);	
				}else {
					StopDialog dialog = new StopDialog();
					dialog.show();
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
		};
		
		run_button.addMouseListener(run_listener);
		stop_button.addMouseListener(run_listener);
		
		control_panel.setBackground(Color.white);
		setting_panel.setBackground(Color.white);
		run_panel.setBackground(Color.white);
		
		control_panel.setOpaque(true);
		setting_panel.setOpaque(true);
		run_panel.setOpaque(true);
		
		unload_label.setBackground(MyColor.BLUE_10);
		load_label.setBackground(MyColor.BLUE_10);
		press_label.setBackground(MyColor.BLUE_10);
		low_label.setBackground(MyColor.BLUE_10);
		time_label.setBackground(MyColor.BLUE_10);
		unit_label.setBackground(MyColor.BLUE_10);
		
		device_label.setOpaque(true);
		device_label.setBackground(MyColor.BLUE_10);
		device_val_label.setBorder(new LineBorder(MyColor.BLUE_10, 1));

		device_save_button.addMouseListener(new MouseListener() {
			@Override
			public void mouseReleased(MouseEvent e) {
				short device = Short.parseShort(device_val_label.getText().toString());
				if(device < 1) {
					AppData.showErrorToast("1보다 작은 수는 입력할 수 없습니다.");
					return;
				}
				else if(device > AppData.controlModel_00.USE_COMP_QTY) {
					AppData.showErrorToast("현재 최대 호기("+AppData.controlModel_00.USE_COMP_QTY+")보다 큰 수는 입력할 수 없습니다.");
					return;
				}
				
				if (AppData.deviceModel[device-1] instanceof InjectionModel) {
					InjectionModel model = (InjectionModel) AppData.deviceModel[device-1];
					if (model.MODEL_1 == 2) {
					} else {
						AppData.showErrorToast("인버터가 아닌 호기는 입력 할 수 없습니다.");
						return;
					}
				} else if (AppData.deviceModel[device-1] instanceof OilModel) {
					OilModel model = (OilModel) AppData.deviceModel[device-1];
					if (AppData.getModelOil(model.mMODEL_1+"", model.mVERSION_1+"", model.mVERSION_2+"").indexOf("V") != -1) {
					} else {
						AppData.showErrorToast("인버터가 아닌 호기는 입력 할 수 없습니다.");
						return;
					}
				} else {
					AppData.showErrorToast("인버터가 아닌 호기는 입력 할 수 없습니다.");
					return;
				}

				if((AppData.controlModel_00.TOTAL_RUN_STOP_L_R & 0x01) == 0x01) {
					is_refresh = true;
					AppData.showErrorToast("통합 운전중에는 데이터를 변경할 수 없습니다.");
					return;
				}
				AppData.socket.sendOther04((short) 62, device);
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
		
		press_set_label.setOpaque(true);
		press_set_label.setBackground(MyColor.BLUE_10);
		press_set_val_label.setBorder(new LineBorder(MyColor.BLUE_10, 1));

		press_save_button.addMouseListener(new MouseListener() {
			@Override
			public void mouseReleased(MouseEvent e) {

				if((AppData.controlModel_00.TOTAL_RUN_STOP_L_R & 0x01) == 0x01) {
					is_refresh = true;
					AppData.showErrorToast("통합 운전중에는 데이터를 변경할 수 없습니다.");
					return;
				}
				
				AppData.socket.sendOther04((short) 0, (short) (Float.parseFloat(press_set_val_label.getText().toString())*10.0f));
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
		
		ailgn_save_button.setBackground(MyColor.BLUE);
		device_save_button.setBackground(MyColor.BLUE);
		press_save_button.setBackground(MyColor.BLUE);
		local_mode_save_button.setBackground(MyColor.BLUE);
		single_mode_save_button.setBackground(MyColor.BLUE);
		
		run_button.setBackground(MyColor.BLUE);
		stop_button.setBackground(MyColor.BLUE);
		
		unload_label.setOpaque(true);
		load_label.setOpaque(true);
		press_label.setOpaque(true);
		low_label.setOpaque(true);
		time_label.setOpaque(true);
		unit_label.setOpaque(true);
		
		ailgn_save_button.setOpaque(true);
		device_save_button.setOpaque(true);
		press_save_button.setOpaque(true);
		local_mode_save_button.setOpaque(true);
		single_mode_save_button.setOpaque(true);
		
		eco_checkbox.setOpaque(false);
		
		run_button.setOpaque(true);
		stop_button.setOpaque(true);
		
		unload_val_label.setBorder(new LineBorder(MyColor.BLUE_10, 1));
		load_val_label.setBorder(new LineBorder(MyColor.BLUE_10, 1));
		press_val_label.setBorder(new LineBorder(MyColor.BLUE_10, 1));
		low_val_label.setBorder(new LineBorder(MyColor.BLUE_10, 1));
		time_val_label.setBorder(new LineBorder(MyColor.BLUE_10, 1));
		unit_val_label.setBorder(new LineBorder(MyColor.BLUE_10, 1));
		
		unload_sign_label.setBorder(new LineBorder(MyColor.BLUE_10, 1));
		load_sign_label.setBorder(new LineBorder(MyColor.BLUE_10, 1));
		press_sign_label.setBorder(new LineBorder(MyColor.BLUE_10, 1));
		low_sign_label.setBorder(new LineBorder(MyColor.BLUE_10, 1));
		time_sign_label.setBorder(new LineBorder(MyColor.BLUE_10, 1));
		unit_sign_label.setBorder(new LineBorder(MyColor.BLUE_10, 1));
		
		align_label.setBorder(new LineBorder(Color.black, 2));
		mode_label.setBorder(new LineBorder(Color.black, 2));
		mode2_label.setBorder(new LineBorder(Color.black, 2));

		set_align_panel.setBorder(new RoundedBorder(MyColor.BLUE, 10));
		time_align_panel.setBorder(new RoundedBorder(Color.white, 10, MyColor.BLUE));
		eco_panel.setBorder(new RoundedBorder(MyColor.BLUE_10, 10, MyColor.BLUE_10));
		
		local_mode_panel.setBorder(new RoundedBorder(MyColor.BLUE, 10));
		remote_mode_panel.setBorder(new RoundedBorder(Color.white, 10, MyColor.BLUE));
		single_mode_panel.setBorder(new RoundedBorder(MyColor.BLUE, 10));
		multi_mode_panel.setBorder(new RoundedBorder(Color.white, 10, MyColor.BLUE));
		
		run_label.setBorder(new LineBorder(Color.black, 2));

		int width = 1920;
		int height = 1080;
		int main_width = 1500;
		int main_height = 800;
		int control_width = 740;
		int control_height = 350;
		int setting_width = 740;
		int setting_height = 280;
		int run_width = 1485;
		int run_height = 350;
		
		int save_width = 70;
		
		int cancel_height = 70;
		
		int setting_col = 6;

		if(((AppData.controlModel_00.OPTION_DEVICE >> 3) & 0x01) == 0x01) {
			setting_col = 8;
			main_height = 920;
			setting_height = 370;
			control_height = setting_height+(12*setting_col);
		}
		
		control_panel.setPreferredSize(new Dimension(main_width/2, control_height));
		setting_panel.setPreferredSize(new Dimension(main_width/2, control_height));
		run_panel.setPreferredSize(new Dimension(main_width, run_height+30));
		cancel_label.setPreferredSize(new Dimension(main_width, cancel_height));
		
		unload_label.setPreferredSize(new Dimension(control_width/3, control_height/8));
		load_label.setPreferredSize(new Dimension(control_width/3, control_height/8));
		press_label.setPreferredSize(new Dimension(control_width/3, control_height/8));
		low_label.setPreferredSize(new Dimension(control_width/3, control_height/8));
		time_label.setPreferredSize(new Dimension(control_width/3, control_height/8));
		unit_label.setPreferredSize(new Dimension(control_width/3, control_height/8));
		
		unload_panel.setPreferredSize(new Dimension(control_width/3, control_height/8));
		load_panel.setPreferredSize(new Dimension(control_width/3, control_height/8));
		press_panel.setPreferredSize(new Dimension(control_width/3, control_height/8));
		low_panel.setPreferredSize(new Dimension(control_width/3, control_height/8));
		time_panel.setPreferredSize(new Dimension(control_width/3, control_height/8));
		unit_panel.setPreferredSize(new Dimension(control_width/3, control_height/8));
		
		unload_val_label.setPreferredSize(new Dimension((int) ((control_width/3) * 0.7), control_height/8));
		load_val_label.setPreferredSize(new Dimension((int) ((control_width/3) * 0.7), control_height/8));
		press_val_label.setPreferredSize(new Dimension((int) ((control_width/3) * 0.7), control_height/8));
		low_val_label.setPreferredSize(new Dimension((int) ((control_width/3) * 0.7), control_height/8));
		time_val_label.setPreferredSize(new Dimension((int) ((control_width/3) * 0.7), control_height/8));
		unit_val_label.setPreferredSize(new Dimension((int) ((control_width/3) * 0.7), control_height/8));
		
		unload_sign_label.setPreferredSize(new Dimension((int) ((control_width/3) * 0.3), control_height/8));
		load_sign_label.setPreferredSize(new Dimension((int) ((control_width/3) * 0.3), control_height/8));
		press_sign_label.setPreferredSize(new Dimension((int) ((control_width/3) * 0.3), control_height/8));
		low_sign_label.setPreferredSize(new Dimension((int) ((control_width/3) * 0.3), control_height/8));
		time_sign_label.setPreferredSize(new Dimension((int) ((control_width/3) * 0.3), control_height/8));
		unit_sign_label.setPreferredSize(new Dimension((int) ((control_width/3) * 0.3), control_height/8));

		
		align_label.setPreferredSize(new Dimension(setting_width, (int) (setting_height/setting_col)));
		if(((AppData.controlModel_00.OPTION_DEVICE >> 3) & 0x01) == 0x01) {
			set_align_panel.setPreferredSize(new Dimension((setting_width-save_width)/3, (int) (setting_height/setting_col)));
			time_align_panel.setPreferredSize(new Dimension((setting_width-save_width)/3, (int) (setting_height/setting_col)));
			eco_panel.setPreferredSize(new Dimension((setting_width-save_width)/3, (int) (setting_height/setting_col)));	
			eco_checkbox.setPreferredSize(new Dimension((int) ((setting_width-save_width)/3*0.1), (int) (setting_height/setting_col)));
			eco_label.setPreferredSize(new Dimension((int) ((setting_width-save_width)/3*0.9), (int) (setting_height/setting_col)));

			device_label.setPreferredSize(new Dimension((setting_width-save_width)/2, (int) (setting_height/setting_col)));
			device_val_label.setPreferredSize(new Dimension((setting_width-save_width)/2, (int) (setting_height/setting_col)));
			device_save_button.setPreferredSize(new Dimension(save_width, (int) (setting_height/setting_col)));
			
			press_set_label.setPreferredSize(new Dimension((setting_width-save_width)/2, (int) (setting_height/setting_col)));
			press_set_val_label.setPreferredSize(new Dimension((setting_width-save_width)/2, (int) (setting_height/setting_col)));
			press_save_button.setPreferredSize(new Dimension(save_width, (int) (setting_height/setting_col)));
		}else {
			set_align_panel.setPreferredSize(new Dimension((setting_width-save_width)/2, (int) (setting_height/setting_col)));
			time_align_panel.setPreferredSize(new Dimension((setting_width-save_width)/2, (int) (setting_height/setting_col)));
			eco_panel.setPreferredSize(new Dimension(0,0));
			eco_checkbox.setPreferredSize(new Dimension(0,0));
			eco_label.setPreferredSize(new Dimension(0,0));

			device_label.setPreferredSize(new Dimension(0,0));
			device_val_label.setPreferredSize(new Dimension(0,0));
			device_save_button.setPreferredSize(new Dimension(0,0));
			
			press_set_label.setPreferredSize(new Dimension(0,0));
			press_set_val_label.setPreferredSize(new Dimension(0,0));
			press_save_button.setPreferredSize(new Dimension(0,0));
		}
		
		ailgn_save_button.setPreferredSize(new Dimension(save_width, (int) (setting_height/setting_col)));

		
		
		mode_label.setPreferredSize(new Dimension(setting_width, (int) (setting_height/setting_col)));
		local_mode_label.setPreferredSize(new Dimension((setting_width-save_width)/2, (int) (setting_height/setting_col)));
		remote_mode_label.setPreferredSize(new Dimension((setting_width-save_width)/2, (int) (setting_height/setting_col)));
		local_mode_save_button.setPreferredSize(new Dimension(save_width, (int) (setting_height/setting_col)));
		
		mode2_label.setPreferredSize(new Dimension(setting_width, (int) (setting_height/setting_col)));
		single_mode_label.setPreferredSize(new Dimension((setting_width-save_width)/2, (int) (setting_height/setting_col)));
		multi_mode_label.setPreferredSize(new Dimension((setting_width-save_width)/2, (int) (setting_height/setting_col)));
		single_mode_save_button.setPreferredSize(new Dimension(save_width, (int) (setting_height/setting_col)));
		
		run_label.setPreferredSize(new Dimension(run_width, 70));
		run_button.setPreferredSize(new Dimension(run_width/2, 150));
		stop_button.setPreferredSize(new Dimension(run_width/2, 150));
		
		top_panel.setPreferredSize(new Dimension(main_width, 100));
		main_panel.setPreferredSize(new Dimension(main_width,main_height));
		main_panel.setBounds(0,0,main_width,main_height);

		setPreferredSize(new Dimension(width,height));
		setBounds(0,0,width,height);
		
		setLocationRelativeTo(null);
		refresh();
	}
	
	ControlModel_00 before;
	OtherModel_04 before_other;
	boolean is_refresh = false;
	void refresh() {
		boolean is_align = true;
		boolean is_mode = true;
		boolean is_local_mode = true;
		boolean is_unload = true;
		boolean is_load = true;
		boolean is_press = true;
		boolean is_unit = true;
		boolean is_time = true;
		boolean is_low = true;
		
		if(before != null) {
			is_align = before.COMP_SORT != AppData.controlModel_00.COMP_SORT;
			is_mode = before.TOTAL_INDIVIDUAL_MODE != AppData.controlModel_00.TOTAL_INDIVIDUAL_MODE;
			is_local_mode = before.TOTAL_RUN_STOP_L_R != AppData.controlModel_00.TOTAL_RUN_STOP_L_R;
			is_unload = before.UNLOAD_PRESSURE != AppData.controlModel_00.UNLOAD_PRESSURE;
			is_load = before.LOAD_PRESSURE != AppData.controlModel_00.LOAD_PRESSURE;
			is_press = before_other.DEVICE_PRESS_MAIN != AppData.otherModel_04.DEVICE_PRESS_MAIN;
			
			is_unit = before.COMP_START_QTY != AppData.controlModel_00.COMP_START_QTY;
			is_time = before.CHANGE_TIME_HOUR != AppData.controlModel_00.CHANGE_TIME_HOUR;
			is_low = before.LOW_ALARM_PRESSURE != AppData.controlModel_00.LOW_ALARM_PRESSURE;
		}
		
		if(is_refresh) {
			is_refresh = false;
			is_align = true;
			is_mode = true;
			is_local_mode = true;
			is_unload = true;
			is_load = true;
			is_press = true;
			is_unit = true;
			is_time = true;
			is_low = true;
		}
		
		// 모드 정렬 데이터 표시
		if(is_align) {
			if((AppData.controlModel_00.COMP_SORT & 0x01) == 0x01){
				align_val = 1;
				set_align_panel.setBorder(new RoundedBorder(Color.white, 10, MyColor.BLUE));
				set_align_label.setForeground(MyColor.BLUE);	
				
				time_align_panel.setBorder(new RoundedBorder(MyColor.BLUE, 10));
				time_align_label.setForeground(Color.white);
			}else {
				align_val = 0;
				set_align_panel.setBorder(new RoundedBorder(MyColor.BLUE, 10));
				set_align_label.setForeground(Color.white);
				
				time_align_panel.setBorder(new RoundedBorder(Color.white, 10, MyColor.BLUE));
				time_align_label.setForeground(MyColor.BLUE);	
			}
			

			if(((AppData.controlModel_00.COMP_SORT >> 8) & 0x01) == 0x01){
				eco_checkbox.setSelected(true);
			}else {
				eco_checkbox.setSelected(false);
			}
		}

		if(is_mode) {
			// 모드 정렬 데이터 표시
			if((AppData.controlModel_00.TOTAL_INDIVIDUAL_MODE & 0x01) == 0x01){
				multi_mode_panel.setBorder(new RoundedBorder(MyColor.BLUE, 10));
				multi_mode_label.setForeground(Color.white);
				
				single_mode_panel.setBorder(new RoundedBorder(Color.white, 10, MyColor.BLUE));
				single_mode_label.setForeground(MyColor.BLUE);	
			}else {
				multi_mode_panel.setBorder(new RoundedBorder(Color.white, 10, MyColor.BLUE));
				multi_mode_label.setForeground(MyColor.BLUE);	
				
				single_mode_panel.setBorder(new RoundedBorder(MyColor.BLUE, 10));
				single_mode_label.setForeground(Color.white);
			}
		}

		if(is_local_mode) {
			// 모드 정렬 데이터 표시
			if((AppData.controlModel_00.TOTAL_RUN_STOP_L_R >> 8 & 0x01) == 0x01){
				local_mode_panel.setBorder(new RoundedBorder(Color.white, 10, MyColor.BLUE));
				local_mode_label.setForeground(MyColor.BLUE);	
				
				remote_mode_panel.setBorder(new RoundedBorder(MyColor.BLUE, 10));
				remote_mode_label.setForeground(Color.white);
			}else {
				local_mode_panel.setBorder(new RoundedBorder(MyColor.BLUE, 10));
				local_mode_label.setForeground(Color.white);
				
				remote_mode_panel.setBorder(new RoundedBorder(Color.white, 10, MyColor.BLUE));
				remote_mode_label.setForeground(MyColor.BLUE);	
			}
		}
		
		// 통합제어 데이터 표시	
		if(is_unload) unload_val_label.setText(String.format("%.1f", AppData.controlModel_00.UNLOAD_PRESSURE/ 10.0));
		if(is_load) load_val_label.setText(String.format("%.1f", AppData.controlModel_00.LOAD_PRESSURE/ 10.0));
		if(is_press) press_val_label.setText(String.format("%.1f", AppData.otherModel_04.DEVICE_PRESS_MAIN/ 10.0));
		
		if(is_unit) unit_val_label.setText(String.format("%d", AppData.controlModel_00.COMP_START_QTY));
		if(is_time) time_val_label.setText(String.format("%d", AppData.controlModel_00.CHANGE_TIME_HOUR));
		if(is_low) low_val_label.setText(String.format("%.1f", AppData.controlModel_00.LOW_ALARM_PRESSURE / 10.0));
		
		
		
		
		before = AppData.controlModel_00;
		before_other = AppData.otherModel_04;
	}
	
}
