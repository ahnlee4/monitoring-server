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
import javax.swing.JPasswordField;
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

public class NameDialog extends JDialog{
	JPanel top_panel, main_panel;
	
	JLabel password_label, ok_label, cancel_label;
	JTextField password_val_label;
	
	public NameDialog(int index) {
		setLayout(new FlowLayout(1,0,0));

		setUndecorated(true);
		setAlwaysOnTop(true);
		setDefaultCloseOperation(javax.swing.WindowConstants.HIDE_ON_CLOSE);
		setBackground(new Color(0f,0f,0f,0.6f));
		
		add(top_panel = new MyPanel(new FlowLayout(0,0,0)));
		add(main_panel = new JPanel(new FlowLayout(0,0,0)));
		main_panel.setBackground(Color.white);
		
		main_panel.add(password_label = new MyLabel("공장명 입력",0, MyFont.Font_24, Color.black));
		main_panel.add(password_val_label = new JTextField(""));
		main_panel.add(ok_label = new MyLabel("확인",0, MyFont.Font_24, Color.WHITE));
		main_panel.add(cancel_label = new MyLabel("닫기",0, MyFont.Font_24, Color.WHITE));

		password_val_label.setFont(MyFont.Font_24);
		password_val_label.setForeground(Color.black);
		password_val_label.setHorizontalAlignment(0);
		
		KeyListener pass_listener = new KeyListener() {
			@Override
			public void keyTyped(KeyEvent e) {
			}
			@Override
			public void keyReleased(KeyEvent e) {
	            if(e.getKeyCode() != KeyEvent.VK_ENTER) return;
	            
	            if(index == 0) AppData.FACTORY_1 = password_val_label.getText().toString();
	            else if(index == 1) AppData.FACTORY_2 = password_val_label.getText().toString();
	            else if(index == 2) AppData.FACTORY_3 = password_val_label.getText().toString();
	            else if(index == 3) AppData.FACTORY_4 = password_val_label.getText().toString();
	            else if(index == 4) AppData.FACTORY_5 = password_val_label.getText().toString();

            	AppData.setEncryptedFile();
				dispose();
			}
			@Override
			public void keyPressed(KeyEvent e) {
			}
		};
		password_val_label.addKeyListener(pass_listener);
		

		ok_label.setBackground(MyColor.GREEN);
		ok_label.setOpaque(true);
		ok_label.addMouseListener(new MouseListener() {
			@Override
			public void mouseReleased(MouseEvent e) {
	            int level = isPassword(password_val_label.getText().toString());
	            if(level == AppData.USER_FAIL) {
					dispose();
	            	return;
	            }
	            SettingDialog dialog = new SettingDialog(level);
	            dialog.show();
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
		
		int width = 1920;
		int height = 1080;
		int main_width = 1500;
		int main_height = 210;
		
		int cancel_height = 70;
		password_label.setPreferredSize(new Dimension((int)(main_width * 0.3), cancel_height));
		password_val_label.setPreferredSize(new Dimension((int)(main_width * 0.7), cancel_height));
		ok_label.setPreferredSize(new Dimension(main_width, cancel_height));
		cancel_label.setPreferredSize(new Dimension(main_width, cancel_height));
		
		top_panel.setPreferredSize(new Dimension(main_width, 400));
		main_panel.setPreferredSize(new Dimension(main_width,main_height));
		main_panel.setBounds(0,0,main_width,main_height);

		setPreferredSize(new Dimension(width,height));
		setBounds(0,0,width,height);
		
		setLocationRelativeTo(null);
	}
	
	public int isPassword(String pass) {
		if(pass.equals(AppData.USER_0_PASSWORD)) {
			return AppData.USER_LEVEL_0;
		}else if(pass.equals(AppData.USER_1_PASSWORD)) {
			return AppData.USER_LEVEL_1;
		}else if(pass.equals(AppData.USER_2_PASSWORD)) {
			return AppData.USER_LEVEL_2;
		}
		return AppData.USER_FAIL;
	}
}
