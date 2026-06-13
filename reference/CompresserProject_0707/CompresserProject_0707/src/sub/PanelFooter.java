package sub;

import java.awt.Color;
import java.awt.Dimension;
import java.awt.FlowLayout;
import java.awt.GridLayout;
import java.awt.Image;
import java.awt.event.ActionEvent;
import java.awt.event.ActionListener;
import java.awt.event.ItemEvent;
import java.awt.event.ItemListener;
import java.awt.event.MouseEvent;
import java.awt.event.MouseListener;

import javax.swing.ImageIcon;
import javax.swing.JCheckBox;
import javax.swing.JLabel;
import javax.swing.JOptionPane;
import javax.swing.JPanel;
import javax.swing.border.EmptyBorder;
import javax.swing.border.LineBorder;

import border.RoundedBorder;
import dialog.FloatingDialog;
import utill.AppData;
import utill.MyColor;
import utill.MyFont;
import utill.MyLabel;
import utill.MyPanel;

public class PanelFooter extends JPanel{
	
	JPanel mode_panel, control_panel, option_panel, floating_panel;
	JLabel floating_menu, floating_device;
	
	public PanelFooter(int scale) {
		setLayout(new FlowLayout(0,2,0));
		
		//========================= 최상위 레이아웃 ===========================================
		add(mode_panel = new MyPanel(new FlowLayout(0,0,0)));
		add(control_panel = new MyPanel(new FlowLayout(0,0,0)));
		add(option_panel = new MyPanel(new FlowLayout(0,0,0)));
		add(floating_panel = new MyPanel(new FlowLayout(0,0,0)));
		
		//========================= FLOATING 레이아웃 ===========================================
		floating_panel.add(floating_device = new JLabel("",0));
		floating_panel.add(floating_menu = new JLabel("",0));

		floating_device.addMouseListener(new MouseListener() {
			@Override
			public void mouseReleased(MouseEvent e) {
				if(AppData.subForm == null || !AppData.subForm.isShowing()) {
					AppData.mainForm.setVisible(false);
					AppData.subForm = new FormSub();
					AppData.subForm.setVisible(true);					
				}else {
					AppData.subForm.dispose();
					AppData.mainForm.setVisible(true);
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
		
		floating_menu.addMouseListener(new MouseListener() {
			@Override
			public void mouseReleased(MouseEvent e) {
				FloatingDialog dialog = new FloatingDialog();
				dialog.show();
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
		
		floating_panel.setOpaque(false);
		
		//========================= 해상도별 레이아웃 ===========================================
		if(scale == 1920) {
			int height = 200-2;
			int mod_width = 400;
			int control_width = 500;
			int option_width = 920;
			int label_width = 70;
			int floating_width = 100;
			
			setPreferredSize(new Dimension(1920, 200));
			setSize(1920, 200);
			
			mode_panel.setPreferredSize(new Dimension(mod_width-2, height));
			control_panel.setPreferredSize(new Dimension(control_width-2, height));
			option_panel.setPreferredSize(new Dimension(option_width-2, height));
			floating_panel.setPreferredSize(new Dimension(floating_width-2, height));
			
			floating_device.setPreferredSize(new Dimension(floating_width, height/2));
			floating_menu.setPreferredSize(new Dimension(floating_width, height/2));
			floating_device.setIcon(new ImageIcon(new ImageIcon(getClass().getResource("/images/device_back.png")).getImage().getScaledInstance(floating_width-10, height/2-10, Image.SCALE_SMOOTH)));
			floating_menu.setIcon(new ImageIcon(new ImageIcon(getClass().getResource("/images/menu.png")).getImage().getScaledInstance(floating_width-10, height/2-10, Image.SCALE_SMOOTH)));
		}else {
			
		}
		
		setOpaque(false);
	}
	
	public void refresh() {
	}
}
