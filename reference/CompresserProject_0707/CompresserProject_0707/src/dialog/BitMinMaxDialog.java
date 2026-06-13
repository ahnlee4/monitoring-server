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

public class BitMinMaxDialog extends JDialog{
	JPanel top_panel, main_panel;
	
	JLabel min_label, max_label, cancel_label;
	JLabel min_val_label, max_val_label;
	JLabel min_sign_label, max_sign_label;
	
	public BitMinMaxDialog(DeviceInfo deviceInfo) {
		setLayout(new FlowLayout(1,0,0));

		setUndecorated(true);
		setAlwaysOnTop(true);
		setDefaultCloseOperation(javax.swing.WindowConstants.HIDE_ON_CLOSE);
		setBackground(new Color(0f,0f,0f,0.6f));
		
		add(top_panel = new MyPanel(new FlowLayout(0,0,0)));
		add(main_panel = new JPanel(new FlowLayout(0,10,10)));
		main_panel.setBackground(Color.white);
		
		main_panel.add(min_label = new MyLabel("Min",0, MyFont.Font_24, Color.black));
		main_panel.add(min_val_label = new MyLabel("0.0",0, MyFont.Font_24, MyColor.BLUE));
		main_panel.add(min_sign_label = new MyLabel("℃",0, MyFont.Font_24, MyColor.BLUE));
		main_panel.add(max_label = new MyLabel("Max",0, MyFont.Font_24, Color.black));
		main_panel.add(max_val_label = new MyLabel("0.0",0, MyFont.Font_24, MyColor.BLUE));
		main_panel.add(max_sign_label = new MyLabel("℃",0, MyFont.Font_24, MyColor.BLUE));
		main_panel.add(cancel_label = new MyLabel("닫기",0, MyFont.Font_24, Color.WHITE));

		float min = 0;
		float max = 0;
		if(deviceInfo.category == AppData.CATEGORY_DIO1) {
        	if(AppData.DIO_BIT0 == 5) {
            	min = AppData.aioModel[deviceInfo.index].CH1_MIN / 100.0f;
            	max = AppData.aioModel[deviceInfo.index].CH1_MAX / 100.0f;
        		min_sign_label.setText("bar");
        		max_sign_label.setText("bar");
        		min_val_label.setText(String.format("%.2f", min));
        		max_val_label.setText(String.format("%.2f", max));
        	}else {
            	min = AppData.aioModel[deviceInfo.index].CH1_MIN / 10.0f;
            	max = AppData.aioModel[deviceInfo.index].CH1_MAX / 10.0f;
        		min_sign_label.setText("℃");
        		max_sign_label.setText("℃");
        		min_val_label.setText(String.format("%.1f", min));
        		max_val_label.setText(String.format("%.1f", max));
        	}
		}else if(deviceInfo.category == AppData.CATEGORY_DIO2) {

			// ========================== 2호기 AIO 데이터 처리 구문 ==========================================
        	if(AppData.DIO_BIT4 == 5) {
    			min = AppData.aioModel[deviceInfo.index].CH1_MIN / 100.0f;
            	max = AppData.aioModel[deviceInfo.index].CH1_MAX / 100.0f;
        		min_sign_label.setText("bar");
        		max_sign_label.setText("bar");
        		min_val_label.setText(String.format("%.2f", min));
        		max_val_label.setText(String.format("%.2f", max));
        	}else {
    			min = AppData.aioModel[deviceInfo.index].CH1_MIN / 10.0f;
            	max = AppData.aioModel[deviceInfo.index].CH1_MAX / 10.0f;
        		min_sign_label.setText("℃");
        		max_sign_label.setText("℃");
        		min_val_label.setText(String.format("%.1f", min));
        		max_val_label.setText(String.format("%.1f", max));
        	}
			// ========================== 2호기 AIO 데이터 처리 구문 ==========================================
		}
		
		min_val_label.setBorder(new LineBorder(MyColor.BLACK));
		max_val_label.setBorder(new LineBorder(MyColor.BLACK));
		
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
		int main_width = 700;
		int main_height = 250;
		
		int content_width = 660;
		
		int cancel_height = 60;
		int button_height = 75;
		min_label.setPreferredSize(new Dimension((short)(content_width*0.5), button_height));
		max_label.setPreferredSize(new Dimension((short)(content_width*0.5), button_height));
		min_val_label.setPreferredSize(new Dimension((short)(content_width*0.4), button_height));
		max_val_label.setPreferredSize(new Dimension((short)(content_width*0.4), button_height));
		min_sign_label.setPreferredSize(new Dimension((short)(content_width*0.1), button_height));
		max_sign_label.setPreferredSize(new Dimension((short)(content_width*0.1), button_height));
		
		cancel_label.setPreferredSize(new Dimension(content_width+10, cancel_height));
		
		top_panel.setPreferredSize(new Dimension(width, 400));
		main_panel.setPreferredSize(new Dimension(main_width,main_height));
		main_panel.setBounds(0,0,main_width,main_height);

		setPreferredSize(new Dimension(width,height));
		setBounds(0,0,width,height);
		
		setLocationRelativeTo(null);
	}
}
