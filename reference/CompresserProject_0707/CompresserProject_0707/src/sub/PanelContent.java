package sub;

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
import javax.swing.JScrollPane;
import javax.swing.border.EmptyBorder;
import javax.swing.border.LineBorder;

import border.RoundedBorder;
import dialog.BitControlDialog;
import dialog.BitMinMaxDialog;
import dialog.SingleControlDialog;
import model.DeviceInfo;
import model.InjectionModel;
import model.MyModel;
import model.OilModel;
import utill.AppData;
import utill.MyColor;
import utill.MyFont;
import utill.MyLabel;
import utill.MyPanel;

public class PanelContent extends JPanel{
	PanelDevice panelDevice[] = new PanelDevice[255];

	int width = 1920;
	int height = 780;
	int col = 4;
	int device_width = (width-(col*8)) / col;
	int device_height = (height - 26) / 2;
	
	JScrollPane jsp;
	JPanel panel;
	
	public PanelContent(int scale) {
		setLayout(new FlowLayout(0,0,0));
		add(jsp = new JScrollPane(panel = new MyPanel(new GridLayout(0, col))));
		panel.setOpaque(false);
		jsp.setOpaque(false);
		jsp.setBorder(null);
		jsp.getViewport().setOpaque(false);
		jsp.getViewport().setBorder(null);
		jsp.setPreferredSize(new Dimension((int)(width), height));
		panel.setPreferredSize(new Dimension((int)(width), height));
		
		if(scale == 1920) {
			setPreferredSize(new Dimension(width, height));
		}else {
			
		}
		setBorder(new EmptyBorder(2,2,2,2));
		setOpaque(false);
		refresh();
	}
	
		
	
	public void refresh() {
		int display_count = 0;
		for(int i=0; i<AppData.controlModel_00.USE_COMP_QTY; i++) {
			if(panelDevice[display_count] == null) {
				panel.add(panelDevice[display_count] = new PanelDevice(device_width, device_height, new DeviceInfo(), AppData.deviceModel[i]));
			}
			panelDevice[display_count].show();
			
			if(AppData.deviceModel[i] instanceof InjectionModel) {
				InjectionModel model = (InjectionModel) AppData.deviceModel[i];
				panelDevice[display_count].deviceInfo.index = i;
				panelDevice[display_count].deviceInfo.category = AppData.CATEGORY_INJECTION;
				panelDevice[display_count].deviceInfo.type = AppData.getModelName(model.MODEL_2);
				panelDevice[display_count].deviceInfo.press = model.SERVICE_PRESSURE / 100.0f;
				panelDevice[display_count].deviceInfo.temp = model.SERVICE_TEMP / 10.0f;
				panelDevice[display_count].deviceInfo.status = model.CP_STATUS;
				panelDevice[display_count].deviceInfo.mode = model.RUN_MODE;
				panelDevice[display_count].deviceInfo.alarm = model.ALARM != 0;
				panelDevice[display_count].deviceInfo.totalTime = (model.TOTAL_RUN_TIME_H << 8 | model.TOTAL_RUN_TIME_L);
				panelDevice[display_count].deviceInfo.connected = ((AppData.controlModel_00.COMP_CONNECT >> i) & 0x01) == 0x01;
				
				if(model.MODEL_1 == 2) {
					panelDevice[display_count].deviceInfo.is_inverter = true;						
					panelDevice[display_count].deviceInfo.control_press = model.INV_TARGET_PRESSURE / 10.0f;		
					panelDevice[display_count].deviceInfo.rpm = model.INV_RPM;		
					panelDevice[display_count].deviceInfo.fault = model.FAULT_FLG != 0 | model.FAULT_INV != 0;
				}else {
					panelDevice[display_count].deviceInfo.is_inverter = false;
					panelDevice[display_count].deviceInfo.load = model.LOAD_PRESSURE / 10.0f;
					panelDevice[display_count].deviceInfo.noload = model.UNLOAD_PRESSURE / 10.0f;
					panelDevice[display_count].deviceInfo.fault = model.FAULT_FLG != 0;
				}	
				display_count++;				
			}else if(AppData.deviceModel[i] instanceof OilModel) {
				OilModel model = (OilModel) AppData.deviceModel[i];
				panelDevice[display_count].deviceInfo.index = i;
				panelDevice[display_count].deviceInfo.category = AppData.CATEGORY_OIL;
				panelDevice[display_count].deviceInfo.type = AppData.getModelOil(model.mMODEL_1+"", model.mVERSION_1+"", model.mVERSION_2+"");
				panelDevice[display_count].deviceInfo.press = model.P1/100.0f;
				panelDevice[display_count].deviceInfo.temp = model.T1;
				panelDevice[display_count].deviceInfo.status = model.mCP_STATUS;
				panelDevice[display_count].deviceInfo.mode = model.mRUN_MODE;
				panelDevice[display_count].deviceInfo.alarm = model.mALARM_FLAG != 0;
				panelDevice[display_count].deviceInfo.totalTime = (model.mTOTAL_RUN_TIME_H << 8 | model.mTOTAL_RUN_TIME_L);
				panelDevice[display_count].deviceInfo.connected = ((AppData.controlModel_00.COMP_CONNECT >> i)
						& 0x01) == 0x01;

				if (panelDevice[display_count].deviceInfo.type.indexOf("V") != -1) {
					panelDevice[display_count].deviceInfo.is_inverter = true;
					panelDevice[display_count].deviceInfo.control_press = model.mINV_TargetP;
					panelDevice[display_count].deviceInfo.rpm = model.mINV_RPM;
					panelDevice[display_count].deviceInfo.fault = (model.mFAULT_FLG_H << 8 | model.mFAULT_FLG_L) != 0 | model.mFAULT_INV != 0;
				} else {
					panelDevice[display_count].deviceInfo.is_inverter = false;
					panelDevice[display_count].deviceInfo.load = model.mLOAD_P;
					panelDevice[display_count].deviceInfo.noload = model.mUNLOAD_P;
					panelDevice[display_count].deviceInfo.fault = (model.mFAULT_FLG_H << 8 | model.mFAULT_FLG_L) != 0;
				}
				display_count++;
			}else {
				panelDevice[display_count].deviceInfo.index = i;
				panelDevice[display_count].deviceInfo.category = -1;
				panelDevice[display_count].deviceInfo.type = "Micos ---";
				panelDevice[display_count].deviceInfo.connected = ((AppData.controlModel_00.COMP_CONNECT >> i) & 0x01) == 0x01;
				display_count++;
			}
		}
		

		try {
			if(4 % display_count!=0) {
				int mod = 4 % display_count;
				for(int i=0; i<mod; i++) {
					if(panelDevice[display_count] == null) {
						panel.add(panelDevice[display_count] = new PanelDevice(device_width, device_height, new DeviceInfo(), null));
					}
					panelDevice[display_count].hide();
					display_count++;
				}
			}
			
			for(int i=0; i<(byte)AppData.controlModel_00.USE_DEVICE; i++) {
				if(AppData.DIO_BIT0 != 6) {
					// 1호기
					if(panelDevice[display_count] == null) {
						panel.add(panelDevice[display_count] = new PanelDevice(device_width, device_height, new DeviceInfo(), AppData.dioModel[i]));
					}
					
					panelDevice[display_count].show();
					
					panelDevice[display_count].deviceInfo.index = i;
					panelDevice[display_count].deviceInfo.category = AppData.CATEGORY_DIO1;
					if(AppData.aioModel[i] != null) {
						if(AppData.DIO_BIT0 == 5) panelDevice[display_count].deviceInfo.press = AppData.aioModel[i].CH1_OUT / 100.0f;
						else panelDevice[display_count].deviceInfo.press = AppData.aioModel[i].CH1_OUT / 10.0f;
					}
					
					if(AppData.dioModel[i] != null) {
						panelDevice[display_count].deviceInfo.status = (AppData.dioModel[i].INPUT_STATUS & 0x0F);
						panelDevice[display_count].deviceInfo.fault = ((AppData.dioModel[i].INPUT_STATUS >> 1) & 0x01) == 0x01;
						panelDevice[display_count].deviceInfo.connected = true;
					}else {
						panelDevice[display_count].deviceInfo.fault = false;
						panelDevice[display_count].deviceInfo.connected = false;
					}
					display_count++;
				}
					

				if(AppData.DIO_BIT4 != 6) {
					if(panelDevice[display_count] == null) {
						panel.add(panelDevice[display_count] = new PanelDevice(device_width, device_height, new DeviceInfo(), AppData.dioModel[i]));
					}
	
					panelDevice[display_count].show();
					
					// 2호기						
					panelDevice[display_count].deviceInfo.index = i;
					panelDevice[display_count].deviceInfo.category = AppData.CATEGORY_DIO2;

					if(AppData.aioModel[i] != null) {
						// ========================== 2호기 AIO 데이터 처리 구문 ==========================================
						if(AppData.DIO_BIT4 == 5) panelDevice[display_count].deviceInfo.press = AppData.aioModel[i].CH1_OUT / 100.0f;
						else panelDevice[display_count].deviceInfo.press = AppData.aioModel[i].CH1_OUT / 10.0f;
						// ========================== 2호기 AIO 데이터 처리 구문 ==========================================
					}
					
					if(AppData.dioModel[i] != null) {
						panelDevice[display_count].deviceInfo.status = ((AppData.dioModel[i].INPUT_STATUS >> 4) & 0x0F);
						panelDevice[display_count].deviceInfo.fault = ((AppData.dioModel[i].INPUT_STATUS >> 5) & 0x01) == 0x01;
						panelDevice[display_count].deviceInfo.connected = true;
					}else {
						panelDevice[display_count].deviceInfo.fault = false;
						panelDevice[display_count].deviceInfo.connected = false;
					}
					display_count++;
				}
			}
		} catch (Exception e) {
			e.printStackTrace();
		}
		
//AIO
//		try {
//			for(int i=0; i<AppData.aioModel.length; i++) {
//				if(AppData.aioModel[i]._has) {
//					if(panelDevice[display_count] == null) {
//						panel.add(panelDevice[display_count] = new PanelDevice(device_width, device_height, new DeviceInfo()));
//					}
//					display_count++;
//				}
//			}
//		} catch (Exception e) {
//		}
		
		for(int i=0; i<display_count; i++) {
			panelDevice[i].refresh();
		}
		
	}
	
	class PanelDevice extends JPanel{
		JPanel top_panel, center_panel;
		JPanel top_left_panel, top_right_panel, center_left_panel, center_right_panel;
		JPanel val_panel;
		
		JLabel status_label;
		JLabel img_label;
		JLabel type_label;
		JLabel name_label, val_label, local_label, run_label, run_back, load_label;
		JPanel run_panel;
		
		DeviceInfo deviceInfo;
		MyModel model;
		int width, height;

        int bit0State = AppData.DIO_BIT0;
        int bit4State = AppData.DIO_BIT4;
		
		public PanelDevice(int width, int height, DeviceInfo deviceInfo, MyModel model) {
			this.width = width;
			this.height = height;
			this.model = model;
			this.deviceInfo = deviceInfo;
			setLayout(new FlowLayout(0,0,0));
			setOpaque(false);
			setBorder(new EmptyBorder(10,10,10,10));

			add(top_panel = new MyPanel(new FlowLayout(0,0,0)));
			add(center_panel = new MyPanel(new FlowLayout(0,0,0)));

			top_panel.addMouseListener(new MouseListener() {
				@Override
				public void mouseReleased(MouseEvent e) {
					if(deviceInfo.category == AppData.CATEGORY_DIO1 || deviceInfo.category == AppData.CATEGORY_DIO2) {
						BitMinMaxDialog dialog = new BitMinMaxDialog(deviceInfo);
						dialog.show();
					}else {
						if(deviceInfo.connected) {
							SingleControlDialog dialog = new SingleControlDialog(deviceInfo);
							dialog.show();
						}else {
							AppData.showErrorToast("통신오류 기기 입니다.");
						}
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

			center_panel.addMouseListener(new MouseListener() {
				@Override
				public void mouseReleased(MouseEvent e) {
					if(deviceInfo.category == AppData.CATEGORY_DIO1 || deviceInfo.category == AppData.CATEGORY_DIO2) {
						BitControlDialog dialog = new BitControlDialog(deviceInfo);
						dialog.show();
					}else {
						if(deviceInfo.connected) {
							SingleControlDialog dialog = new SingleControlDialog(deviceInfo);
							dialog.show();
						}else {
							AppData.showErrorToast("통신오류 기기 입니다.");
						}
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
			
			top_panel.add(top_left_panel = new MyPanel(new FlowLayout(0,0,0)));
			top_panel.add(top_right_panel = new MyPanel(new FlowLayout(0,0,0)));
			
			top_right_panel.add(name_label = new MyLabel("-호기 (Micos -)",0, MyFont.Font_18, MyColor.WHITE));
			top_right_panel.add(val_panel = new MyPanel(new GridLayout()));
			val_panel.add(val_label = new MyLabel("0.0 bar",0, MyFont.Font_32, Color.WHITE));
			
			center_panel.add(center_left_panel = new MyPanel(new FlowLayout(1,0,0)));
			center_panel.add(center_right_panel = new MyPanel(new FlowLayout(0,0,0)));
			
			center_left_panel.add(status_label = new MyLabel("STATUS",0, MyFont.Font_18, Color.black));
			center_left_panel.add(local_label = new MyLabel("LOC",0, MyFont.Font_18, Color.black));
			
			center_left_panel.add(run_panel = new JPanel(null));
			run_panel.add(run_label = new MyLabel("RDY",0, MyFont.Font_18, Color.black));
			run_panel.add(run_back = new JLabel("",0));
			center_left_panel.add(load_label = new MyLabel("부하",0, MyFont.Font_18, Color.black));
			
			center_right_panel.add(img_label = new JLabel("",0));
			center_right_panel.add(type_label = new MyLabel("",0, MyFont.Font_24, MyColor.DARK_BLUE));
			

			name_label.setBackground(MyColor.NAME);
			val_panel.setBorder(new RoundedBorder(Color.black, 20, MyColor.NAME));
			status_label.setBackground(MyColor.STATUS);
			
			local_label.setBorder(new LineBorder(MyColor.STATUS, 2));
			run_panel.setBorder(new LineBorder(MyColor.STATUS, 2));
			load_label.setBorder(new LineBorder(MyColor.STATUS, 2));
			
			name_label.setOpaque(true);
			status_label.setOpaque(true);
			local_label.setOpaque(true);
			run_panel.setOpaque(true);
			load_label.setOpaque(true);
			
			setPreferredSize(new Dimension(width, height));
			setSize(width, height);

			top_width = (int)(width*0.8); top_height = 90;
			center_width = (int)(width*0.8); center_height = height - top_height;

			status_width = (int)(top_width*0.2); status_height = 40;
			val_width = (int)(top_width*0.8); val_height = 60;
			img_width = (int)(center_width*0.8); img_height = 240;
			
			top_left_panel.setPreferredSize(new Dimension((int)(top_width*0.2), top_height));
			top_right_panel.setPreferredSize(new Dimension((int)(top_width*0.8), top_height));
			center_left_panel.setPreferredSize(new Dimension((int)(center_width*0.2), center_height));
			center_right_panel.setPreferredSize(new Dimension((int)(center_width*0.8), center_height));
			
			type_label.setPreferredSize(new Dimension((int)(center_width*0.8), 40));
			
			val_panel.setPreferredSize(new Dimension(val_width, val_height));
			val_label.setPreferredSize(new Dimension(val_width, val_height));
			status_label.setPreferredSize(new Dimension(status_width, status_height));
			local_label.setPreferredSize(new Dimension(status_width, status_height));
			run_panel.setPreferredSize(new Dimension(status_width, status_height));
			run_label.setBounds(0,0,status_width, status_height);
			run_back.setBounds(2,2,status_width-4, status_height-4);
			
			load_label.setPreferredSize(new Dimension(status_width, status_height));
			img_label.setPreferredSize(new Dimension(img_width, img_height));
		}

		int top_width = (int)(width*0.8); int top_height = 90;
		int center_width = (int)(width*0.8); int center_height = height - top_height;

		int status_width = (int)(top_width*0.2); int status_height = 40;
		int val_width = (int)(top_width*0.8); int val_height = 60;
		int img_width = (int)(center_width*0.8); int img_height = 240;
		
		long time = 0;
		public void refresh() {
			if(is_hide) {
				top_panel.setVisible(false);
				center_panel.setVisible(false);
				return;
			}else {
				center_panel.setVisible(true);
			}
			
		    ImageIcon originalImage = null;
		    boolean is_width = false;
		    
			if(deviceInfo.category == AppData.CATEGORY_INJECTION) {
				name_label.setText(String.format("%d호기 (%s)", deviceInfo.index+1, deviceInfo.type));
				name_label.setHorizontalAlignment(2);
				int stringWidth = name_label.getFontMetrics(MyFont.Font_18).stringWidth(name_label.getText());
				name_label.setPreferredSize(new Dimension(stringWidth, 30));
				
				is_width = true;
				top_panel.setVisible(true);
				if(deviceInfo.is_inverter) {
					originalImage = new ImageIcon(getClass().getResource("/images/injection_v_mini.png"));
				}else {
					originalImage = new ImageIcon(getClass().getResource("/images/injection_mini.png"));
				}
			}else if(deviceInfo.category == AppData.CATEGORY_OIL) {
				name_label.setText(String.format("%d호기 (%s)", deviceInfo.index+1, deviceInfo.type));
				name_label.setHorizontalAlignment(2);
				int stringWidth = name_label.getFontMetrics(MyFont.Font_18).stringWidth(name_label.getText());
				name_label.setPreferredSize(new Dimension(stringWidth, 30));
				
				top_panel.setVisible(true);
				if(deviceInfo.is_inverter) {
					originalImage = new ImageIcon(getClass().getResource("/images/equip_mini.png"));
				}else {
					originalImage = new ImageIcon(getClass().getResource("/images/equip_n_mini.png"));
				}
			}else if(deviceInfo.category == AppData.CATEGORY_DIO1) {
				name_label.setText("MT-G0801");
				name_label.setHorizontalAlignment(0);
				name_label.setPreferredSize(new Dimension(val_width, 30));

				if(AppData.bit_list[AppData.DIO_BIT0].indexOf("_") != -1) type_label.setText(AppData.bit_list[AppData.DIO_BIT0].substring(0,AppData.bit_list[AppData.DIO_BIT0].indexOf("_")));
				else type_label.setText(AppData.bit_list[AppData.DIO_BIT0]);
				
				if(AppData.DIO_BIT0 == 0) {
					top_panel.setVisible(false);
					originalImage = new ImageIcon(getClass().getResource("/images/dryer.png"));	
				}else if(AppData.DIO_BIT0 == 1) {
					top_panel.setVisible(true);
					originalImage = new ImageIcon(getClass().getResource("/images/adsorption_img.png"));
				}else if(AppData.DIO_BIT0 == 2) {
					top_panel.setVisible(false);
					originalImage = new ImageIcon(getClass().getResource("/images/cooler.png"));
				}else if(AppData.DIO_BIT0 == 3) {
					top_panel.setVisible(false);
					originalImage = new ImageIcon(getClass().getResource("/images/dryer2.png"));
				}else if(AppData.DIO_BIT0 == 4) {
					top_panel.setVisible(false);
					originalImage = new ImageIcon(getClass().getResource("/images/freeze_img.png"));
				}else if(AppData.DIO_BIT0 == 5) {
					top_panel.setVisible(true);
					originalImage = new ImageIcon(getClass().getResource("/images/transmeter.png"));
				}else if(AppData.DIO_BIT0 == 7) {
					top_panel.setVisible(false);
					originalImage = new ImageIcon(getClass().getResource("/images/adsorption_img.png"));
				}else if(AppData.DIO_BIT0 == 8) {
					top_panel.setVisible(false);
					originalImage = new ImageIcon(getClass().getResource("/images/dryer_gumi.png"));
				}else if(AppData.DIO_BIT0 == 9) {
					top_panel.setVisible(false);
					originalImage = new ImageIcon(getClass().getResource("/images/cooler_gumi.png"));
				}else {
					top_panel.setVisible(true);
					originalImage = new ImageIcon(getClass().getResource("/images/equip_n.png"));
				}
			}else if(deviceInfo.category == AppData.CATEGORY_DIO2) {
				name_label.setText("MT-G0801");
				name_label.setHorizontalAlignment(0);
				name_label.setPreferredSize(new Dimension(val_width, 30));
				
				if(AppData.bit_list[AppData.DIO_BIT4].indexOf("_") != -1) type_label.setText(AppData.bit_list[AppData.DIO_BIT4].substring(0,AppData.bit_list[AppData.DIO_BIT4].indexOf("_")));
				else type_label.setText(AppData.bit_list[AppData.DIO_BIT4]);
				
				if(AppData.DIO_BIT4 == 0) {
					top_panel.setVisible(false);
					originalImage = new ImageIcon(getClass().getResource("/images/dryer.png"));	
				}else if(AppData.DIO_BIT4 == 1) {
					top_panel.setVisible(true);
					originalImage = new ImageIcon(getClass().getResource("/images/adsorption_img.png"));
				}else if(AppData.DIO_BIT4 == 2) {
					top_panel.setVisible(false);
					originalImage = new ImageIcon(getClass().getResource("/images/cooler.png"));
				}else if(AppData.DIO_BIT4 == 3) {
					top_panel.setVisible(false);
					originalImage = new ImageIcon(getClass().getResource("/images/dryer2.png"));
				}else if(AppData.DIO_BIT4 == 4) {
					top_panel.setVisible(false);
					originalImage = new ImageIcon(getClass().getResource("/images/freeze_img.png"));
				}else if(AppData.DIO_BIT4 == 5) {
					top_panel.setVisible(true);
					originalImage = new ImageIcon(getClass().getResource("/images/transmeter.png"));
				}else if(AppData.DIO_BIT4 == 7) {
					top_panel.setVisible(false);
					originalImage = new ImageIcon(getClass().getResource("/images/adsorption_img.png"));
				}else if(AppData.DIO_BIT4 == 8) {
					top_panel.setVisible(false);
					originalImage = new ImageIcon(getClass().getResource("/images/dryer_gumi.png"));
				}else if(AppData.DIO_BIT4 == 9) {
					top_panel.setVisible(false);
					originalImage = new ImageIcon(getClass().getResource("/images/cooler_gumi.png"));
				}else {
					top_panel.setVisible(true);
					originalImage = new ImageIcon(getClass().getResource("/images/equip_n.png"));
				}
			}else {
				originalImage = new ImageIcon(getClass().getResource("/images/equip_n.png"));
			}
			
			int MAX_WIDTH = img_width;
			int MAX_HEIGHT = img_height;
		    int width = originalImage.getIconWidth();
		    int height = originalImage.getIconHeight();
		    
		    if(height > width) {
		    	width = (int) (width * (MAX_HEIGHT / (float) height));
		        height = MAX_HEIGHT;
		    }else {
		    	height = (int) (height * (MAX_WIDTH / (float) width));
		        width = MAX_WIDTH;
		    }
		    
			if(width==0) width = 240;
			if(height==0) height = 240;
			
		    img_label.setIcon(new ImageIcon(originalImage.getImage().getScaledInstance(width, height, Image.SCALE_SMOOTH)));
			

			if(top_panel.isVisible()) {
				if(deviceInfo.category == AppData.CATEGORY_DIO1 || deviceInfo.category == AppData.CATEGORY_DIO2) {
					if(AppData.aioModel[deviceInfo.index] == null || !AppData.is_connected) {
						val_label.setText("FAIL");
					}else {
						if(deviceInfo.press >= 327) {
							if(deviceInfo.category == AppData.CATEGORY_DIO1) {
								if(AppData.DIO_BIT0 == 5) val_label.setText("--- bar");
								else val_label.setText("--- ℃");
							}else if(deviceInfo.category == AppData.CATEGORY_DIO2) {
								if(AppData.DIO_BIT4 == 5) val_label.setText("--- bar");
								else val_label.setText("--- ℃");
							}
						}else {
							if(deviceInfo.category == AppData.CATEGORY_DIO1) {
								if(AppData.DIO_BIT0 == 5) val_label.setText(String.format("%.2f bar", deviceInfo.press));
								else val_label.setText(String.format("%.1f ℃", deviceInfo.press));
							}else if(deviceInfo.category == AppData.CATEGORY_DIO2) {
								if(AppData.DIO_BIT4 == 5) val_label.setText(String.format("%.2f bar", deviceInfo.press));
								else val_label.setText(String.format("%.1f ℃", deviceInfo.press));
							}
						}	
					}
				}else {
					if(deviceInfo.press >= 327 || !deviceInfo.connected || !AppData.is_connected) {
						val_label.setText("--- bar");
					}else {
						val_label.setText(String.format("%.1f bar", deviceInfo.press));
					}		
				}
			}

			
			if(deviceInfo.mode == 0) {
				local_label.setText("LOC");
				local_label.setBackground(MyColor.LOC);
			}else if(deviceInfo.mode == 1) {
				local_label.setText("REM");
				local_label.setBackground(MyColor.LOC);
			}else if(deviceInfo.mode == 2) {
				local_label.setText("스케쥴");
				local_label.setBackground(MyColor.LOC);
			}else if(deviceInfo.mode == 3) {
				local_label.setText("스케쥴대기");
				local_label.setBackground(MyColor.LOC);
			}
			
			if(!deviceInfo.connected || !AppData.is_connected) {
				if(!run_label.getText().equals("FAIL")) {
					run_back.setIcon(new ImageIcon(new ImageIcon(getClass().getResource("/images/failure.png")).getImage().getScaledInstance(status_width+30, status_height, Image.SCALE_SMOOTH)));
					run_label.setText("FAIL");
					run_label.setForeground(MyColor.WHITE);
				}
			}else if(deviceInfo.fault) {
				if(!run_label.getText().equals("FAULT")) {
					run_back.setIcon(new ImageIcon(new ImageIcon(getClass().getResource("/images/fault.png")).getImage().getScaledInstance(status_width+30, status_height, Image.SCALE_SMOOTH)));
					run_label.setText("FAULT");
					run_label.setForeground(MyColor.WHITE);
				}
			}else {
				run_back.setIcon(null);
				if(deviceInfo.status == 0) {
					run_label.setText("RDY");
					run_label.setForeground(MyColor.BLACK);
					run_panel.setBackground(MyColor.RDY);
				}else {
					run_label.setText("RUN");
					run_label.setForeground(MyColor.BLACK);
					run_panel.setBackground(MyColor.RED);
				}
			}
			
			if(deviceInfo.status == 0) {
				load_label.setVisible(false);
			}else {
				if(deviceInfo.status == 5) {
					load_label.setVisible(true);
					load_label.setText("무부하");
					load_label.setBackground(MyColor.YELLOW);
				}else if(deviceInfo.status == 6) {
					load_label.setVisible(true);
					load_label.setText("부하");
					load_label.setBackground(MyColor.RED);
				}else {
					load_label.setVisible(false);
				}
			}
			
			
//			if(deviceInfo.status == 1) {
//				load_label.setVisible(false);
//				load_label.setText("자동정지");
//				load_label.setBackground(MyColor.RED);
//			}else if(deviceInfo.status == 2 || deviceInfo.status == 3 || deviceInfo.status == 4) {
//				load_label.setVisible(false);
//				load_label.setText("운전시작");
//				load_label.setBackground(MyColor.RED);
//			}else if(deviceInfo.status == 5) {
//				load_label.setVisible(false);
//				load_label.setText("무부하");
//				load_label.setBackground(MyColor.RED);
//			}else if(deviceInfo.status == 6) {
//				load_label.setVisible(true);
//				load_label.setText("부하");
//				load_label.setBackground(MyColor.RED);
//			}else if(deviceInfo.status == 7) {
//				load_label.setVisible(false);
//				load_label.setText("정지지연");
//				load_label.setBackground(MyColor.RED);
//			}else if(deviceInfo.status == 8) {
//				load_label.setVisible(false);
//				load_label.setText("배기");
//				load_label.setBackground(MyColor.RED);
//			}

			show();
		}
		
		boolean is_hide = false;
		public void hide() {
			is_hide = true;
		}
		
		public void show() {
			is_hide = false;
		}
	}
}
