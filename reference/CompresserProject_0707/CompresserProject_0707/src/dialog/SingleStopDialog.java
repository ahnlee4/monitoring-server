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

public class SingleStopDialog extends JDialog{
	JPanel top_panel, main_panel;
	
	JLabel title_label, stop_label, all_stop_label, cancel_label;
	
	public SingleStopDialog(DeviceInfo deviceInfo) {
		setLayout(new FlowLayout(1,0,0));

		setUndecorated(true);
		setAlwaysOnTop(true);
		setDefaultCloseOperation(javax.swing.WindowConstants.HIDE_ON_CLOSE);
		setBackground(new Color(0f,0f,0f,0.6f));
		
		add(top_panel = new MyPanel(new FlowLayout(0,0,0)));
		add(main_panel = new JPanel(new FlowLayout(0,10,10)));
		main_panel.setBackground(Color.white);
		
		main_panel.add(title_label = new MyLabel((deviceInfo.index+1)+"호기 장비를 정지하시겠습니까?",0, MyFont.Font_24, Color.black));
		main_panel.add(stop_label = new MyLabel("장비 정지 안함",0, MyFont.Font_24, Color.WHITE));
		main_panel.add(all_stop_label = new MyLabel("장비 정지",0, MyFont.Font_24, Color.WHITE));
		main_panel.add(cancel_label = new MyLabel("닫기",0, MyFont.Font_24, Color.WHITE));

		stop_label.setBackground(MyColor.BLUE_50);
		stop_label.setOpaque(true);
		stop_label.addMouseListener(new MouseListener() {
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
		
		all_stop_label.setBackground(MyColor.RED);
		all_stop_label.setOpaque(true);
		all_stop_label.addMouseListener(new MouseListener() {
			@Override
			public void mouseReleased(MouseEvent e) {
				int id = (deviceInfo.index + 0x11) << 8;
				
				if(deviceInfo.category == AppData.CATEGORY_INJECTION) {
					AppData.socket.sendMap((short)(id+26), (short)(0x01));	
				}else if(deviceInfo.category == AppData.CATEGORY_OIL) {
					AppData.socket.sendMap((short)(id+68), (short)(0x01));					
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
		
		int width = 1920;
		int height = 1080;
		int main_width = 1000;
		int main_height = 250;
		
		int content_width = 970;
		
		int cancel_height = 60;
		int button_height = 90;
		title_label.setPreferredSize(new Dimension(content_width, cancel_height));
		stop_label.setPreferredSize(new Dimension(content_width/2, button_height));
		all_stop_label.setPreferredSize(new Dimension(content_width/2, button_height));
		
		cancel_label.setPreferredSize(new Dimension(content_width+10, cancel_height));
		
		top_panel.setPreferredSize(new Dimension(main_width, 400));
		main_panel.setPreferredSize(new Dimension(main_width,main_height));
		main_panel.setBounds(0,0,main_width,main_height);

		setPreferredSize(new Dimension(width,height));
		setBounds(0,0,width,height);
		
		setLocationRelativeTo(null);
	}
}
