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
import javax.swing.JTextField;
import javax.swing.border.LineBorder;

import border.RoundedBorder;
import model.ControlModel_00;
import model.DeviceInfo;
import utill.AppData;
import utill.MyColor;
import utill.MyFont;
import utill.MyLabel;
import utill.MyPanel;
import utill.MyTextField;

public class BitControlDialog extends JDialog{
	JPanel top_panel, main_panel;
	
	JLabel title_label, stop_label, all_stop_label, cancel_label;
	
	public BitControlDialog(DeviceInfo deviceInfo) {
		setLayout(new FlowLayout(1,0,0));

		setUndecorated(true);
		setAlwaysOnTop(true);
		setDefaultCloseOperation(javax.swing.WindowConstants.HIDE_ON_CLOSE);
		setBackground(new Color(0f,0f,0f,0.6f));
		
		add(top_panel = new MyPanel(new FlowLayout(0,0,0)));
		add(main_panel = new JPanel(new FlowLayout(0,10,10)));
		main_panel.setBackground(Color.white);
		
		main_panel.add(title_label = new MyLabel("드라이어",0, MyFont.Font_24, Color.black));
		main_panel.add(stop_label = new MyLabel("운    전",0, MyFont.Font_24, Color.black));
		main_panel.add(all_stop_label = new MyLabel("정    지",0, MyFont.Font_24, Color.black));
		main_panel.add(cancel_label = new MyLabel("닫기",0, MyFont.Font_24, Color.WHITE));

		stop_label.setBorder(new LineBorder(MyColor.RED));
		stop_label.addMouseListener(new MouseListener() {
			@Override
			public void mouseReleased(MouseEvent e) {
				int id = (deviceInfo.index + 0xE0) << 8;
				if(deviceInfo.category == AppData.CATEGORY_DIO1) {
					AppData.socket.sendMap((short)(id+4), (short)(0x02));
				}else if(deviceInfo.category == AppData.CATEGORY_DIO2) {
					AppData.socket.sendMap((short)(id+4), (short)(0x0a));
				}				
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

		all_stop_label.setBorder(new LineBorder(MyColor.BLUE));
		all_stop_label.addMouseListener(new MouseListener() {
			@Override
			public void mouseReleased(MouseEvent e) {
				int id = (deviceInfo.index + 0xE0) << 8;
				if(deviceInfo.category == AppData.CATEGORY_DIO1) {
					AppData.socket.sendMap((short)(id+4), (short)(0x01));	
				}else if(deviceInfo.category == AppData.CATEGORY_DIO2) {
					AppData.socket.sendMap((short)(id+4), (short)(0x09));					
				}				
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
		
		
		if(deviceInfo.category == AppData.CATEGORY_DIO1) {
			if(AppData.bit_list[AppData.DIO_BIT0].indexOf("_") != -1) title_label.setText(AppData.bit_list[AppData.DIO_BIT0].substring(0,AppData.bit_list[AppData.DIO_BIT0].indexOf("_")));
			else title_label.setText(AppData.bit_list[AppData.DIO_BIT0]);
		}else if(deviceInfo.category == AppData.CATEGORY_DIO2) {
			if(AppData.bit_list[AppData.DIO_BIT4].indexOf("_") != -1) title_label.setText(AppData.bit_list[AppData.DIO_BIT4].substring(0,AppData.bit_list[AppData.DIO_BIT4].indexOf("_")));
			else title_label.setText(AppData.bit_list[AppData.DIO_BIT4]);
		}
		
		
		int width = 1920;
		int height = 1080;
		int main_width = 500;
		int main_height = 250;
		
		int content_width = 470;
		
		int cancel_height = 60;
		int button_height = 90;
		title_label.setPreferredSize(new Dimension(content_width, cancel_height));
		stop_label.setPreferredSize(new Dimension(content_width/2, button_height));
		all_stop_label.setPreferredSize(new Dimension(content_width/2, button_height));
		
		cancel_label.setPreferredSize(new Dimension(content_width+10, cancel_height));
		
		top_panel.setPreferredSize(new Dimension(width, 400));
		main_panel.setPreferredSize(new Dimension(main_width,main_height));
		main_panel.setBounds(0,0,main_width,main_height);

		setPreferredSize(new Dimension(width,height));
		setBounds(0,0,width,height);
		
		setLocationRelativeTo(null);
	}
}
