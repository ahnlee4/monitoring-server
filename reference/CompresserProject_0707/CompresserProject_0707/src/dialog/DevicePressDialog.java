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
import javax.swing.JDialog;
import javax.swing.JFrame;
import javax.swing.JLabel;
import javax.swing.JPanel;
import javax.swing.JScrollPane;
import javax.swing.JTextField;
import javax.swing.border.LineBorder;

import border.RoundedBorder;
import model.ControlModel_00;
import utill.AppData;
import utill.MyColor;
import utill.MyFont;
import utill.MyLabel;
import utill.MyPanel;
import utill.MyTextField;

public class DevicePressDialog extends JDialog{
	JPanel top_panel, main_panel;
	
	JPanel main, sub;
	JScrollPane jsp;
	
	JLabel main_press_label;
	JLabel main_val_label, main_sign_label;
	JLabel pad[] = new JLabel[16];
	
	Content content[] = new Content[12];

	int width = 1920;
	int height = 1080;
	int main_width = 1500;
	int main_height = 600;
	
	int left_width = 480;
	int right_width = 980;

	int content_height = 580;
	int pad_height = content_height-160;
	int label_height = 70;
	
	public DevicePressDialog() {
		setLayout(new FlowLayout(1,0,0));

		setUndecorated(true);
		setAlwaysOnTop(true);
		setDefaultCloseOperation(javax.swing.WindowConstants.HIDE_ON_CLOSE);
		setBackground(new Color(0f,0f,0f,0.6f));
		
		addMouseListener(new MouseListener() {
			
			@Override
			public void mouseReleased(MouseEvent e) {
				dispose();
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
		
		add(top_panel = new MyPanel(new FlowLayout(0,0,0)));
		add(main_panel = new JPanel(new FlowLayout(0,10,10)));
		main_panel.setBackground(Color.white);
		
		main_panel.add(main = new MyPanel(new FlowLayout(0,5,5)));
		main_panel.add(jsp = new JScrollPane(sub = new MyPanel(new FlowLayout(0,5,5))));
		jsp.getVerticalScrollBar().setUnitIncrement(16);
		jsp.setOpaque(false);
		jsp.setBorder(null);
		jsp.getViewport().setOpaque(false);
		jsp.getViewport().setBorder(null);
		
		main.add(main_press_label = new MyLabel("장비별 압력차 설정",0, MyFont.Font_24, MyColor.DARK_BLUE));
		main.add(main_val_label = new MyLabel("",0, MyFont.Font_24, MyColor.BLACK));
		main.add(main_sign_label = new MyLabel("bar",0, MyFont.Font_24, MyColor.DARK_BLUE));
		
		main_press_label.setBorder(new LineBorder(MyColor.BLACK, 2));
		main_val_label.setBackground(MyColor.BLUE_50);
		main_val_label.setOpaque(true);
		main_sign_label.setBorder(new LineBorder(MyColor.BLUE_10, 2));
		
		main.add(pad[0] = new MyLabel("1",0, MyFont.Font_24, MyColor.WHITE));
		main.add(pad[1] = new MyLabel("2",0, MyFont.Font_24, MyColor.WHITE));
		main.add(pad[2] = new MyLabel("3",0, MyFont.Font_24, MyColor.WHITE));
		main.add(pad[3] = new MyLabel("<-",0, MyFont.Font_24, MyColor.WHITE));
		main.add(pad[4] = new MyLabel("4",0, MyFont.Font_24, MyColor.WHITE));
		main.add(pad[5] = new MyLabel("5",0, MyFont.Font_24, MyColor.WHITE));
		main.add(pad[6] = new MyLabel("6",0, MyFont.Font_24, MyColor.WHITE));
		main.add(pad[7] = new MyLabel("CLR",0, MyFont.Font_24, MyColor.WHITE));
		main.add(pad[8] = new MyLabel("7",0, MyFont.Font_24, MyColor.WHITE));
		main.add(pad[9] = new MyLabel("8",0, MyFont.Font_24, MyColor.WHITE));
		main.add(pad[10] = new MyLabel("9",0, MyFont.Font_24, MyColor.WHITE));
		main.add(pad[11] = new MyLabel("ESC",0, MyFont.Font_24, MyColor.WHITE));
		main.add(pad[12] = new MyLabel("-",0, MyFont.Font_24, MyColor.WHITE));
		main.add(pad[13] = new MyLabel("0",0, MyFont.Font_24, MyColor.WHITE));
		main.add(pad[14] = new MyLabel(".",0, MyFont.Font_24, MyColor.WHITE));
		main.add(pad[15] = new MyLabel("ENT",0, MyFont.Font_24, MyColor.WHITE));
		
		MouseListener pad_listener = new MouseListener() {
			@Override
			public void mouseReleased(MouseEvent e) {
				if(e.getSource()==pad[3]) { //지우기
					if(main_val_label.getText().length() != 0) {
						main_val_label.setText(main_val_label.getText().substring(0, main_val_label.getText().length()-1));	
					}
				}else if(e.getSource()==pad[7]) { //초기화
					main_val_label.setText("");
				}else if(e.getSource()==pad[11]) { //종료
					dispose();
				}else if(e.getSource()==pad[15]) { //확인
					AppData.socket.sendOther04((short) (60), (short)(Float.parseFloat(main_val_label.getText())*10.0f));
					try {
						Thread.sleep(200);
					} catch (InterruptedException e1) {
						e1.printStackTrace();
					}
					
					for(int i=0; i < AppData.controlModel_00.USE_COMP_QTY-1; i++) {
						content[i].setPress((short) (Float.parseFloat(main_val_label.getText())*10.0f));
						
						AppData.socket.sendOther04((short) (28+i*2), (short)(Float.parseFloat(main_val_label.getText())*10.0f));
						
						try {
							Thread.sleep(200);
						} catch (InterruptedException e1) {
							e1.printStackTrace();
						}
					}
				}else {
					main_val_label.setText(main_val_label.getText() + ((JLabel) e.getSource()).getText());
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
		
		for(int i=0; i<pad.length; i++) {
			pad[i].addMouseListener(pad_listener);
			pad[i].setPreferredSize(new Dimension((int) ((left_width-20)/4), (pad_height-20)/4));
			pad[i].setBackground(MyColor.BLUE);
			pad[i].setOpaque(true);
		}
		
		for(int i=0; i < AppData.controlModel_00.USE_COMP_QTY-1; i++) {
			sub.add(content[i] = new Content(i, 200, content_height));
		}
		
		main.setPreferredSize(new Dimension(left_width, content_height));
		jsp.setPreferredSize(new Dimension(right_width, content_height));
		sub.setPreferredSize(new Dimension(right_width, content_height));
		
		main_press_label.setPreferredSize(new Dimension(left_width-5, label_height));
		main_val_label.setPreferredSize(new Dimension((int) ((left_width-10)*0.7), label_height));
		main_sign_label.setPreferredSize(new Dimension((int) ((left_width-10)*0.3), label_height));

		top_panel.setPreferredSize(new Dimension(main_width, 100));
		main_panel.setPreferredSize(new Dimension(main_width,main_height));
		main_panel.setBounds(0,0,main_width,main_height);

		setPreferredSize(new Dimension(width,height));
		setBounds(0,0,width,height);
		
		setLocationRelativeTo(null);
		refresh();
	}
	
	void refresh() {
		main_val_label.setText(String.format("%.1f", AppData.otherModel_04.DEVICE_PRESS_MAIN/ 10.0));
		
		short press_list[] = {
				AppData.otherModel_04.DEVICE_PRESS_0, AppData.otherModel_04.DEVICE_PRESS_1, AppData.otherModel_04.DEVICE_PRESS_2, AppData.otherModel_04.DEVICE_PRESS_3,
				AppData.otherModel_04.DEVICE_PRESS_4, AppData.otherModel_04.DEVICE_PRESS_5, AppData.otherModel_04.DEVICE_PRESS_6, AppData.otherModel_04.DEVICE_PRESS_7,
				AppData.otherModel_04.DEVICE_PRESS_8, AppData.otherModel_04.DEVICE_PRESS_9, AppData.otherModel_04.DEVICE_PRESS_10, AppData.otherModel_04.DEVICE_PRESS_11,
				AppData.otherModel_04.DEVICE_PRESS_12, AppData.otherModel_04.DEVICE_PRESS_13, AppData.otherModel_04.DEVICE_PRESS_14, AppData.otherModel_04.DEVICE_PRESS_15,
		};
		for(int i=0; i < AppData.controlModel_00.USE_COMP_QTY-1; i++) {
			content[i].setPress(press_list[i]);
		}
	}
	
	class Content extends MyPanel{
		JLabel press_label;
		JLabel minus_label;
		JLabel plus_label;
		JLabel val_label;
		JPanel panel;
		
		public Content(int index, int width, int height) {
			setLayout(new FlowLayout(1,0,0));
			add(press_label = new MyLabel("압력차 "+(index+1),0, MyFont.Font_24, MyColor.DARK_BLUE));
			add(panel = new MyPanel(new FlowLayout(1,0,0)));

			press_label.setBorder(new LineBorder(Color.black, 2));
			
			panel.setBorder(new RoundedBorder(Color.white, 100, MyColor.BLUE));
			
			panel.add(plus_label = new MyLabel("+ ",0, MyFont.Font_32, MyColor.DARK_BLUE));
			panel.add(val_label = new MyLabel("0.0",0, MyFont.Font_24, MyColor.DARK_BLUE));
			panel.add(minus_label = new MyLabel("- ",0, MyFont.Font_32, MyColor.DARK_BLUE));

			plus_label.addMouseListener(new MouseListener() {
				@Override
				public void mouseReleased(MouseEvent e) {
					float val = Float.parseFloat(val_label.getText());
					if(val < Float.parseFloat(main_val_label.getText())) {
						val+= 0.1;
						val_label.setText(String.format("%.1f", val));
						AppData.socket.sendOther04((short) (28+index*2), (short)(val*10.0f));
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
			minus_label.addMouseListener(new MouseListener() {
				@Override
				public void mouseReleased(MouseEvent e) {
					float val = Float.parseFloat(val_label.getText());
					if(val > 0) {
						val-= 0.1;
						val_label.setText(String.format("%.1f", val));	
						AppData.socket.sendOther04((short) (28+index*2), (short)(val*10.0f));
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

			press_label.setPreferredSize(new Dimension(width,label_height));
			panel.setPreferredSize(new Dimension(100,260));
			
			plus_label.setPreferredSize(new Dimension(100,80));
			val_label.setPreferredSize(new Dimension(100,100));
			minus_label.setPreferredSize(new Dimension(100,80));
			
			setPreferredSize(new Dimension(width,height));
		}

		public void setPress(short s) {
			val_label.setText(String.format("%.1f", s/ 10.0));
		}
	}
}
