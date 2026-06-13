package dialog;

import java.awt.Color;
import java.awt.Dimension;
import java.awt.FlowLayout;
import java.awt.GridLayout;
import java.awt.Image;
import java.awt.event.ActionEvent;
import java.awt.event.ActionListener;
import java.awt.event.KeyEvent;
import java.awt.event.KeyListener;
import java.awt.event.MouseEvent;
import java.awt.event.MouseListener;

import javax.swing.ImageIcon;
import javax.swing.JCheckBox;
import javax.swing.JComboBox;
import javax.swing.JDialog;
import javax.swing.JFrame;
import javax.swing.JLabel;
import javax.swing.JPanel;
import javax.swing.JRadioButton;
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

public class SettingDialog extends JDialog{
	JPanel top_panel, main_panel, content_panel;
	JPanel network_panel, option_panel, align_panel, factory_panel, bit_panel, jsp_panel;
	JPanel count_panel;
	JScrollPane jsp;
	
	JLabel ip_label, port_label, user_level_2_label, user_level_1_label;
	JTextField ip_val_label, port_val_label, user_level_2_val_label, user_level_1_val_label;
	
//	JCheckBox login_check, error_check, sound_check;

	JPanel panel[] = new JPanel[7];
	JRadioButton button[] = new JRadioButton[7];
	JTextField label[][] = new JTextField[7][3];
	JTextField index_label[] = new JTextField[7];
	
	JLabel count_label, count_val_label, count_minus_label, count_plus_label, count_save_label;
	
	JPanel f_panel[] = new JPanel[5];
	JRadioButton f_button[] = new JRadioButton[5];
	JTextField f_label[][] = new JTextField[5][2];
	
	JLabel bit0_label, bit4_label;
	JComboBox bit0_cb, bit4_cb;
	
	JLabel cancel_label;
	
	int level = 0;
	int button_val = -1;
	
	
	public SettingDialog(int level) {
		this.level = level;
		setLayout(new FlowLayout(1,0,0));

		setUndecorated(true);
		setAlwaysOnTop(true);
		setDefaultCloseOperation(javax.swing.WindowConstants.HIDE_ON_CLOSE);
		setBackground(new Color(0f,0f,0f,0.6f));
		
		add(top_panel = new JPanel(new FlowLayout(0,0,0)));
		add(main_panel = new JPanel(new FlowLayout(0,0,0)));
		
		
		top_panel.setOpaque(false);

		main_panel.add(jsp_panel = new MyPanel(new GridLayout()));
		
		jsp_panel.add(jsp = new JScrollPane(content_panel = new MyPanel(new FlowLayout(1,0,0))));
		jsp.getVerticalScrollBar().setUnitIncrement(16);
		jsp.setOpaque(false);
		jsp.setBorder(null);
		jsp.getViewport().setOpaque(false);
		jsp.setVerticalScrollBarPolicy(JScrollPane.VERTICAL_SCROLLBAR_ALWAYS);
		jsp.setHorizontalScrollBarPolicy(JScrollPane.HORIZONTAL_SCROLLBAR_NEVER);

		content_panel.add(network_panel = new MyPanel(new FlowLayout(0,5,0)));
//		content_panel.add(option_panel = new MyPanel(new FlowLayout(0,10,0)));
		content_panel.add(align_panel = new MyPanel(new FlowLayout(0,5,10)));
		content_panel.add(factory_panel = new MyPanel(new FlowLayout(0,5,10)));
		content_panel.add(bit_panel = new MyPanel(new FlowLayout(0,5,10)));
		
		main_panel.add(cancel_label = new MyLabel("닫기",0, MyFont.Font_24, Color.WHITE));
		
		network_panel.add(ip_label = new MyLabel("Connect IP Setting",0, MyFont.Font_24, Color.BLACK));
		network_panel.add(port_label = new MyLabel("Port Setting",0, MyFont.Font_24, Color.BLACK));
		network_panel.add(user_level_2_label = new MyLabel("Login Pw Setting",0, MyFont.Font_24, Color.BLACK));
		network_panel.add(user_level_1_label = new MyLabel("Setting Pw Setting",0, MyFont.Font_24, Color.BLACK));
		
		network_panel.add(ip_val_label = new MyTextField("121.164.120.200",0, MyFont.Font_24, Color.BLACK));
		network_panel.add(port_val_label = new MyTextField("1502",0, MyFont.Font_24, Color.BLACK));
		network_panel.add(user_level_2_val_label = new MyTextField("1234",0, MyFont.Font_24, Color.BLACK));
		network_panel.add(user_level_1_val_label = new MyTextField("471112",0, MyFont.Font_24, Color.BLACK));
		
//		option_panel.add(login_check = new JCheckBox("로그인 했을때만 쓰기"));
//		option_panel.add(error_check = new JCheckBox("고장알람 표시 유무"));
//		option_panel.add(sound_check = new JCheckBox("알람 소리 사용"));
		
		ActionListener button_listener = new ActionListener() {
			@Override
			public void actionPerformed(ActionEvent e) {
				for(int i=0; i<button.length; i++) {
					if(e.getSource() == button[i]) {
						button_val = i;
					}else {
						button[i].setSelected(false);	
					}
				}
			}
		};
		
		KeyListener label_listener = new KeyListener() {
			@Override
			public void keyTyped(KeyEvent e) {
			}
			@Override
			public void keyReleased(KeyEvent e) {
	            if(e.getKeyCode() != KeyEvent.VK_ENTER) return;
	            
				// 1,3,2,0,0,0,0,0,0,0,0,0/
	            String str = "";
	    		for(int i=0; i<panel.length; i++) {
	    			str += label[i][0].getText() + ","; 
	    			str += label[i][1].getText() + ",";
	    			str += label[i][2].getText() + ",0,0,0,0,0,0,0,0,0";
	    			str += "/";
				}
	    		
	    		AppData.socket.sendOther0300(str);
			}
			@Override
			public void keyPressed(KeyEvent e) {
			}
		};

		KeyListener index_listener = new KeyListener() {
			@Override
			public void keyTyped(KeyEvent e) {
			}
			@Override
			public void keyReleased(KeyEvent e) {
	            if(e.getKeyCode() != KeyEvent.VK_ENTER) return;

	    		for(int i=0; i<panel.length; i++) {
	    			if(e.getSource() == index_label[i]) {
	    				AppData.socket.sendOther04((short)(12+i*2), Short.parseShort(index_label[i].getText()));	
	    			}
	    		}
	    		
			}
			@Override
			public void keyPressed(KeyEvent e) {
			}
		};
		
		for(int i=0; i<panel.length; i++) {
			align_panel.add(panel[i] = new MyPanel(new FlowLayout(0,0,0)));
			panel[i].add(button[i] = new JRadioButton());
			
			for(int j=0; j<3; j++) {
				panel[i].add(label[i][j] = new MyTextField("",0, MyFont.Font_24, Color.BLACK));
				label[i][j].setBorder(new LineBorder(MyColor.BLUE_10));
				label[i][j].addKeyListener(label_listener);
			}
			panel[i].add(index_label[i] = new MyTextField("",0, MyFont.Font_24, Color.BLACK));
			index_label[i].setOpaque(true);
			index_label[i].setBackground(MyColor.BLUE_10);
			index_label[i].addKeyListener(index_listener);

			button[i].setHorizontalAlignment(0);
			button[i].setOpaque(false);
			button[i].addActionListener(button_listener);
		}

		align_panel.add(count_label = new MyLabel("사용모드 개수 설정",0, MyFont.Font_24, MyColor.DARK_BLUE));
		align_panel.add(count_panel = new MyPanel(new FlowLayout(0,0,0)));
		count_panel.add(count_minus_label = new MyLabel("-",0, MyFont.Font_32, Color.BLACK));
		count_panel.add(count_val_label = new MyLabel("1",0, MyFont.Font_32, Color.BLACK));
		count_panel.add(count_plus_label = new MyLabel("+",0, MyFont.Font_32, Color.BLACK));
		align_panel.add(count_save_label = new MyLabel("저장",0, MyFont.Font_24, Color.white));
		
		bit_panel.add(bit0_label = new MyLabel("BIT0",0, MyFont.Font_24, MyColor.DARK_BLUE));
		bit_panel.add(bit0_cb = new JComboBox<String>(AppData.bit_list));
		bit_panel.add(bit4_label = new MyLabel("BIT4",0, MyFont.Font_24, MyColor.DARK_BLUE));
		bit_panel.add(bit4_cb = new JComboBox<String>(AppData.bit_list));
		
		bit0_cb.setBackground(MyColor.WHITE);
		bit4_cb.setBackground(MyColor.WHITE);
		
		bit0_cb.setSelectedIndex(AppData.DIO_BIT0);
		bit4_cb.setSelectedIndex(AppData.DIO_BIT4);

		ActionListener bit_listener = new ActionListener() {
			@Override
			public void actionPerformed(ActionEvent e) {
				if (e.getSource() == bit0_cb) {
					AppData.DIO_BIT0 = bit0_cb.getSelectedIndex();
					AppData.setEncryptedFile();
					AppData.showToast("데이터 변경");
				} else if (e.getSource() == bit4_cb) {
					AppData.DIO_BIT4 = bit4_cb.getSelectedIndex();
					AppData.setEncryptedFile();
					AppData.showToast("데이터 변경");
				}
			}
		};
		
		bit0_cb.addActionListener(bit_listener);
		bit4_cb.addActionListener(bit_listener);
		
		KeyListener factory_listener = new KeyListener() {
			@Override
			public void keyTyped(KeyEvent e) {
			}
			@Override
			public void keyReleased(KeyEvent e) {
	            if(e.getKeyCode() != KeyEvent.VK_ENTER) return;

    			if(e.getSource() == f_label[0][0]) AppData.FACTORY_1 = f_label[0][0].getText();
    			else if(e.getSource() == f_label[1][0]) AppData.FACTORY_2 = f_label[1][0].getText();
    			else if(e.getSource() == f_label[2][0]) AppData.FACTORY_3 = f_label[2][0].getText();
    			else if(e.getSource() == f_label[3][0]) AppData.FACTORY_4 = f_label[3][0].getText();
    			else if(e.getSource() == f_label[4][0]) AppData.FACTORY_5 = f_label[4][0].getText();

    			else if(e.getSource() == f_label[0][1]) AppData.FACTORY_IP_1 = f_label[0][1].getText();
    			else if(e.getSource() == f_label[1][1]) AppData.FACTORY_IP_2 = f_label[1][1].getText();
    			else if(e.getSource() == f_label[2][1]) AppData.FACTORY_IP_3 = f_label[2][1].getText();
    			else if(e.getSource() == f_label[3][1]) AppData.FACTORY_IP_4 = f_label[3][1].getText();
    			else if(e.getSource() == f_label[4][1]) AppData.FACTORY_IP_5 = f_label[4][1].getText();
    			
    			AppData.setEncryptedFile();
				AppData.showToast("데이터 변경");
			}
			@Override
			public void keyPressed(KeyEvent e) {
			}
		};

		ActionListener factory_index_listener = new ActionListener() {
			@Override
			public void actionPerformed(ActionEvent e) {
				for (int i = 0; i < f_button.length; i++) {
					if (e.getSource() == f_button[i]) {
						AppData.FACTORY_INDEX = i;
						f_button[i].setSelected(true);

						if(AppData.FACTORY_INDEX == 0) AppData.SERVER_IP = AppData.FACTORY_IP_1;
						else if(AppData.FACTORY_INDEX == 1) AppData.SERVER_IP = AppData.FACTORY_IP_2;
						else if(AppData.FACTORY_INDEX == 2) AppData.SERVER_IP = AppData.FACTORY_IP_3;
						else if(AppData.FACTORY_INDEX == 3) AppData.SERVER_IP = AppData.FACTORY_IP_4;
						else if(AppData.FACTORY_INDEX == 4) AppData.SERVER_IP = AppData.FACTORY_IP_5;
						
						AppData.setEncryptedFile();
						AppData.showToast("데이터 변경");
					} else {
						f_button[i].setSelected(false);
					}
				}
			}
		};
		
		for(int i=0; i<f_panel.length; i++) {
			factory_panel.add(f_panel[i] = new MyPanel(new FlowLayout(0,0,0)));
			f_panel[i].add(f_button[i] = new JRadioButton());
			
			for(int j=0; j<2; j++) {
				f_panel[i].add(f_label[i][j] = new MyTextField("",0, MyFont.Font_24, Color.BLACK));
				f_label[i][j].setBorder(new LineBorder(MyColor.BLUE_10));
				f_label[i][j].addKeyListener(factory_listener);
			}
			f_button[i].setHorizontalAlignment(0);
			f_button[i].setOpaque(false);
			f_button[i].addActionListener(factory_index_listener);
		}
		
		f_label[0][0].setText(AppData.FACTORY_1);
		f_label[1][0].setText(AppData.FACTORY_2);
		f_label[2][0].setText(AppData.FACTORY_3);
		f_label[3][0].setText(AppData.FACTORY_4);
		f_label[4][0].setText(AppData.FACTORY_5);
		f_label[0][1].setText(AppData.FACTORY_IP_1);
		f_label[1][1].setText(AppData.FACTORY_IP_2);
		f_label[2][1].setText(AppData.FACTORY_IP_3);
		f_label[3][1].setText(AppData.FACTORY_IP_4);
		f_label[4][1].setText(AppData.FACTORY_IP_5);
		
//		login_check.setOpaque(false);
//		error_check.setOpaque(false);
//		sound_check.setOpaque(false);
//		login_check.setFont(MyFont.Font_24);
//		error_check.setFont(MyFont.Font_24);
//		sound_check.setFont(MyFont.Font_24);
		
		ip_label.setOpaque(true);
		port_label.setOpaque(true);
		user_level_2_label.setOpaque(true);
		user_level_1_label.setOpaque(true);

		main_panel.setBackground(Color.white);
		
		ip_label.setBackground(MyColor.BLUE_10);
		port_label.setBackground(MyColor.BLUE_10);
		user_level_2_label.setBackground(MyColor.BLUE_10);
		user_level_1_label.setBackground(MyColor.BLUE_10);

		ip_val_label.setBorder(new LineBorder(MyColor.BLUE_10, 1));
		port_val_label.setBorder(new LineBorder(MyColor.BLUE_10, 1));
		user_level_2_val_label.setBorder(new LineBorder(MyColor.BLUE_10, 1));
		user_level_1_val_label.setBorder(new LineBorder(MyColor.BLUE_10, 1));
		
		count_minus_label.addMouseListener(new MouseListener() {
			@Override
			public void mouseReleased(MouseEvent e) {
				int val = Integer.parseInt(count_val_label.getText().toString());
				if(val > 1) val--;
				count_val_label.setText(val+"");
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
		
		count_plus_label.addMouseListener(new MouseListener() {
			@Override
			public void mouseReleased(MouseEvent e) {
				int val = Integer.parseInt(count_val_label.getText().toString());
				if(val < 12) val++;
				count_val_label.setText(val+"");
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
		
		count_label.setBorder(new LineBorder(MyColor.BLACK, 1));
		count_panel.setBorder(new RoundedBorder(Color.white, 30, MyColor.BLUE));
		count_save_label.setBackground(MyColor.BLUE);
		count_save_label.setOpaque(true);
		count_save_label.addMouseListener(new MouseListener() {
			@Override
			public void mouseReleased(MouseEvent e) {
				AppData.socket.sendChangeCount((short)button_val, Short.parseShort(count_val_label.getText().toString()));
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

		KeyListener key_listener = new KeyListener() {
			@Override
			public void keyTyped(KeyEvent e) {
			}
			@Override
			public void keyReleased(KeyEvent e) {
	            if(e.getKeyCode() != KeyEvent.VK_ENTER) return;
	            if(e.getSource() == ip_val_label) {
	            	AppData.SERVER_IP = ip_val_label.getText().toString();
	            	AppData.setEncryptedFile();
	            }else if(e.getSource() == port_val_label) {
	            	String str = port_val_label.getText().toString();
	            	if(!AppData.isNumber(str)) return;
	            	AppData.SERVER_PORT = Integer.parseInt(str);
	            	AppData.setEncryptedFile();
	            }else if(e.getSource() == user_level_2_val_label) {
	            	AppData.USER_2_PASSWORD = user_level_2_val_label.getText().toString();
	            	AppData.setEncryptedFile();
	            }else if(e.getSource() == user_level_1_val_label) {
	            	AppData.USER_1_PASSWORD = user_level_1_val_label.getText().toString();
	            	AppData.setEncryptedFile();
	            }
				AppData.showToast("데이터 변경");
			}
			@Override
			public void keyPressed(KeyEvent e) {
			}
		};
		ip_val_label.addKeyListener(key_listener);
		port_val_label.addKeyListener(key_listener);
		user_level_2_val_label.addKeyListener(key_listener);
		user_level_1_val_label.addKeyListener(key_listener);

//		ActionListener option_listener = new ActionListener() {
//			@Override
//			public void actionPerformed(ActionEvent e) {
//				if(e.getSource() == login_check) {
//	            	AppData.OPTION_LOGIN = login_check.isSelected();
//	            	AppData.setEncryptedFile();
//				}else if(e.getSource() == error_check) {
//	            	AppData.OPTION_ERROR = error_check.isSelected();
//	            	AppData.setEncryptedFile();
//				}else if(e.getSource() == sound_check) {
//	            	AppData.OPTION_SOUND = sound_check.isSelected();
//	            	AppData.setEncryptedFile();
//				}
//				AppData.showToast("데이터 변경");
//			}
//		};
//		login_check.addActionListener(option_listener);
//		error_check.addActionListener(option_listener);
//		sound_check.addActionListener(option_listener);
		
		network_panel.setPreferredSize(new Dimension(main_width, network_height));
//		option_panel.setPreferredSize(new Dimension(main_width, option_height));
		align_panel.setPreferredSize(new Dimension(main_width, align_height));
		factory_panel.setPreferredSize(new Dimension(main_width, align_height));
		bit_panel.setPreferredSize(new Dimension(main_width, bit_height));
		
		ip_label.setPreferredSize(new Dimension(network_width/4, network_height/2));
		port_label.setPreferredSize(new Dimension(network_width/4, network_height/2));
		user_level_2_label.setPreferredSize(new Dimension(network_width/4, network_height/2));
		user_level_1_label.setPreferredSize(new Dimension(network_width/4, network_height/2));
		ip_val_label.setPreferredSize(new Dimension(network_width/4, network_height/2));
		port_val_label.setPreferredSize(new Dimension(network_width/4, network_height/2));
		user_level_2_val_label.setPreferredSize(new Dimension(network_width/4, network_height/2));
		user_level_1_val_label.setPreferredSize(new Dimension(network_width/4, network_height/2));
		
//		login_check.setPreferredSize(new Dimension(option_width/2, option_height/2));
//		error_check.setPreferredSize(new Dimension(option_width/2, option_height/2));
//		sound_check.setPreferredSize(new Dimension(option_width/2, option_height/2));
		
		for(int i=0; i<panel.length; i++) {
			panel[i].setPreferredSize(new Dimension(main_width, list_height/7));
			
			button[i].setPreferredSize(new Dimension(50, list_height/7));
					
			for(int j=0; j<3; j++) {
				label[i][j].setPreferredSize(new Dimension(align_width/3, list_height/7));
			}

			index_label[i].setPreferredSize(new Dimension(150, list_height/7));
		}

		count_label.setPreferredSize(new Dimension((int)(count_width*0.5), count_height/3));
		count_panel.setPreferredSize(new Dimension((int)(count_width*0.25), count_height/3));
		count_save_label.setPreferredSize(new Dimension((int)(count_width*0.25), count_height/3));
		
		count_val_label.setPreferredSize(new Dimension((int)(count_width*0.15), count_height/3));
		count_minus_label.setPreferredSize(new Dimension((int)(count_width*0.05), count_height/3));
		count_plus_label.setPreferredSize(new Dimension((int)(count_width*0.05), count_height/3));
		
		for(int i=0; i<f_panel.length; i++) {
			f_panel[i].setPreferredSize(new Dimension(main_width, list_height/5));
			f_button[i].setPreferredSize(new Dimension(50, list_height/5));
			
			for(int j=0; j<2; j++) {
				f_label[i][j].setPreferredSize(new Dimension(align_width/2, list_height/5));
			}

			if (AppData.FACTORY_INDEX == i) {
				f_button[i].setSelected(true);
			} else {
				f_button[i].setSelected(false);
			}
		}
		
		cancel_label.setPreferredSize(new Dimension(main_width, cancel_height));
		
		top_panel.setPreferredSize(new Dimension(main_width, 100));
		main_panel.setPreferredSize(new Dimension(main_width,main_height));

		jsp_panel.setPreferredSize(new Dimension(main_width,main_height-cancel_height));
		jsp.setPreferredSize(new Dimension(main_width,main_height-cancel_height));
		content_panel.setPreferredSize(new Dimension(main_width,(main_height-cancel_height)+align_height+bit_height));

		bit0_label.setPreferredSize(new Dimension(bit_width/4, bit_height));
		bit0_cb.setPreferredSize(new Dimension(bit_width/4, bit_height));
		bit4_label.setPreferredSize(new Dimension(bit_width/4, bit_height));
		bit4_cb.setPreferredSize(new Dimension(bit_width/4, bit_height));
		
		setPreferredSize(new Dimension(width,height));
		setBounds(0,0,width,height);
		
		ip_val_label.setEnabled(false);
		
		setLocationRelativeTo(null);
		refresh();
	}

	int width = 1920;
	int height = 1080;
	int main_width = 1500;
	int main_height = 900;

	int network_width = 1480;
	int network_height = 120;
	int option_width = 1480;
	int option_height = 150;
	int align_width = 1280;
	int count_width = 1470;
	
	int bit_width = 1470;
	int bit_height = 60;
	
	int align_height = 560;
	int count_height = 200;
	
	int list_height = 360;
	int control_height = 200;
	
	int cancel_height = 70;
	
	void refresh() {
		ip_val_label.setText(AppData.SERVER_IP);
		port_val_label.setText(AppData.SERVER_PORT + "");
		user_level_1_val_label.setText(AppData.USER_1_PASSWORD);
		user_level_2_val_label.setText(AppData.USER_2_PASSWORD);
		
//		login_check.setSelected(AppData.OPTION_LOGIN);
//		error_check.setSelected(AppData.OPTION_ERROR);
//		sound_check.setSelected(AppData.OPTION_SOUND);
		
		if(level == AppData.USER_LEVEL_1) {
			network_panel.setVisible(false);
			factory_panel.setVisible(false);
			bit_panel.setVisible(false);
			main_panel.setPreferredSize(new Dimension(main_width,main_height-network_height));

			jsp_panel.setPreferredSize(new Dimension(main_width,main_height-(cancel_height+network_height)));
			jsp.setPreferredSize(new Dimension(main_width,main_height-(cancel_height+network_height)));
			content_panel.setPreferredSize(new Dimension(main_width,(main_height-(cancel_height+network_height)-bit_height)));
			
		}else if(level == AppData.USER_LEVEL_2) {
			network_panel.setVisible(false);
			factory_panel.setVisible(false);
			bit_panel.setVisible(false);
			main_panel.setPreferredSize(new Dimension(main_width,main_height-network_height));
			
			jsp_panel.setPreferredSize(new Dimension(main_width,main_height-(cancel_height+network_height)));
			jsp.setPreferredSize(new Dimension(main_width,main_height-(cancel_height+network_height)));
			content_panel.setPreferredSize(new Dimension(main_width,(main_height-(cancel_height+network_height)-bit_height)));
		}
		
		try {
			// 1,3,2,0,0,0,0,0,0,0,0,0/
			String list[] = AppData.otherModel_03.ALIGN_LIST.split("/");
					
			for(int i=0; i<list.length; i++) {
				String devies[] = list[i].split(",");
				label[i][0].setText(devies[0]+"");
				label[i][1].setText(devies[1]+"");
				label[i][2].setText(devies[2]+"");
			}
			
			index_label[0].setText(AppData.otherModel_04.RUN_UNIT_0 + "");
			index_label[1].setText(AppData.otherModel_04.RUN_UNIT_1 + "");
			index_label[2].setText(AppData.otherModel_04.RUN_UNIT_2 + "");
			index_label[3].setText(AppData.otherModel_04.RUN_UNIT_3 + "");
			index_label[4].setText(AppData.otherModel_04.RUN_UNIT_4 + "");
			index_label[5].setText(AppData.otherModel_04.RUN_UNIT_5 + "");
			index_label[6].setText(AppData.otherModel_04.RUN_UNIT_6 + "");
			
			for(int i=0; i<button.length; i++) {
				if(i == AppData.otherModel_04.USE_UNIT) {
					if(button_val != i) button_val = i;
					button[i].setSelected(true);
				}else {
					button[i].setSelected(false);
				}
			}
			
			count_val_label.setText(AppData.otherModel_04.USE_UNIT_COUNT + "");	
		} catch (Exception e) {
		}
	}
	
	public void setUser(int level) {
		this.level = level;
	}
}
