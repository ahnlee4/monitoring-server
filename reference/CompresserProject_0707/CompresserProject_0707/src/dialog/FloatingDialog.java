package dialog;

import java.awt.Color;
import java.awt.Dimension;
import java.awt.FlowLayout;
import java.awt.Image;
import java.awt.event.MouseEvent;
import java.awt.event.MouseListener;

import javax.swing.ImageIcon;
import javax.swing.JDialog;
import javax.swing.JFrame;
import javax.swing.JLabel;
import javax.swing.JPanel;

import border.RoundedBorder;
import sub.FormSub;
import utill.AppData;
import utill.MyColor;
import utill.MyFont;

public class FloatingDialog extends JDialog{
	JLabel floating_menu, floating_device, floating_control, floating_set, floating_factory, label, label2;
	JPanel panel;
	public FloatingDialog() {
		setLayout(new FlowLayout(0,0,0));

		setUndecorated(true);
		setAlwaysOnTop(true);
		setDefaultCloseOperation(javax.swing.WindowConstants.HIDE_ON_CLOSE);
		setBackground(new Color(0f, 0f, 0f, 0f));
		
		add(panel = new JPanel(new FlowLayout(0,0,0)));
		panel.add(label = new JLabel("공장 변경", 0));
		panel.add(label2 = new JLabel("", 0));
		panel.add(floating_factory = new JLabel("", 0));
		panel.setOpaque(false);
		
		label.setPreferredSize(new Dimension(180, 50));
		label.setFont(MyFont.Font_24);
		label.setForeground(MyColor.DARK_BLUE);
		label.setBackground(MyColor.BLUE_15);
		label.setOpaque(true);
		label2.setPreferredSize(new Dimension(20, 50));
		
		add(panel = new JPanel(new FlowLayout(0,0,0)));
		panel.add(label = new JLabel("설정", 0));
		panel.add(label2 = new JLabel("", 0));
		panel.add(floating_set = new JLabel("", 0));
		panel.setOpaque(false);
		
		label.setPreferredSize(new Dimension(180, 50));
		label.setFont(MyFont.Font_24);
		label.setForeground(MyColor.DARK_BLUE);
		label.setBackground(MyColor.BLUE_15);
		label.setOpaque(true);
		label2.setPreferredSize(new Dimension(20, 50));

		add(panel = new JPanel(new FlowLayout(0,0,0)));
		panel.add(label = new JLabel("통합운전 설정", 0));
		panel.add(label2 = new JLabel("", 0));
		panel.add(floating_control = new JLabel("", 0));
		panel.setOpaque(false);
		
		label.setPreferredSize(new Dimension(180, 50));
		label.setFont(MyFont.Font_24);
		label.setForeground(MyColor.DARK_BLUE);
		label.setBackground(MyColor.BLUE_15);
		label.setOpaque(true);
		label2.setPreferredSize(new Dimension(20, 50));

		add(panel = new JPanel(new FlowLayout(0,0,0)));
		panel.add(label = new JLabel("상세 화면", 0));
		panel.add(label2 = new JLabel("", 0));
		panel.add(floating_device = new JLabel("", 0));
		panel.setOpaque(false);
		
		label.setPreferredSize(new Dimension(180, 50));
		label.setFont(MyFont.Font_24);
		label.setForeground(MyColor.DARK_BLUE);
		label.setBackground(MyColor.BLUE_15);
		label.setOpaque(true);
		label2.setPreferredSize(new Dimension(20, 50));

		add(panel = new JPanel(new FlowLayout(0,0,0)));
		panel.add(label = new JLabel("", 0));
		panel.add(floating_menu = new JLabel("", 0));
		panel.setOpaque(false);
		
		label.setPreferredSize(new Dimension(200, 50));

		floating_factory.addMouseListener(new MouseListener() {
			@Override
			public void mouseReleased(MouseEvent e) {
				FactoryDialog dialog = new FactoryDialog();
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
		
		floating_menu.addMouseListener(new MouseListener() {
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
		
		floating_device.addMouseListener(new MouseListener() {
			@Override
			public void mouseReleased(MouseEvent e) {
				dispose();
				if(AppData.subForm == null || !AppData.subForm.isShowing()) {
					AppData.subForm = new FormSub();
					AppData.subForm.setVisible(true);				
					AppData.mainForm.setVisible(false);	
				}else {
					AppData.mainForm.setVisible(true);
					AppData.subForm.dispose();
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

		floating_control.addMouseListener(new MouseListener() {
			@Override
			public void mouseReleased(MouseEvent e) {
				ControlDialog dialog = new ControlDialog();
				dialog.show();
				Thread th = new Thread(new Runnable() {
					@Override
					public void run() {
						while(dialog.isShowing()) {
							dialog.refresh();
							try {
								Thread.sleep(100);
							} catch (InterruptedException e) {
								e.printStackTrace();
							}
						}
					}
				});
				th.start();
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
		

		floating_set.addMouseListener(new MouseListener() {
			@Override
			public void mouseReleased(MouseEvent e) {
				// 유저
				SettingDialog dialog = new SettingDialog(AppData.USER_LEVEL_2);
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
		
		
		setPreferredSize(new Dimension(300,500));
		setBounds(1622, 579, 300, 500);
		
		floating_device.setPreferredSize(new Dimension(100, 100));
		floating_menu.setPreferredSize(new Dimension(100, 100));
		floating_control.setPreferredSize(new Dimension(100, 100));
		floating_set.setPreferredSize(new Dimension(100, 100));
		floating_factory.setPreferredSize(new Dimension(100, 100));

		floating_menu.setIcon(new ImageIcon(new ImageIcon(getClass().getResource("/images/close.png")).getImage().getScaledInstance(100-10, 100-10, Image.SCALE_SMOOTH)));
		if(AppData.subForm != null && AppData.subForm.isVisible()) {
			floating_device.setIcon(new ImageIcon(new ImageIcon(getClass().getResource("/images/device_back.png")).getImage().getScaledInstance(100-10, 100-10, Image.SCALE_SMOOTH)));	
		}else {
			floating_device.setIcon(new ImageIcon(new ImageIcon(getClass().getResource("/images/device.png")).getImage().getScaledInstance(100-10, 100-10, Image.SCALE_SMOOTH)));
		}
		
		floating_control.setIcon(new ImageIcon(new ImageIcon(getClass().getResource("/images/control.png")).getImage().getScaledInstance(100-10, 100-10, Image.SCALE_SMOOTH)));
		floating_set.setIcon(new ImageIcon(new ImageIcon(getClass().getResource("/images/setting.png")).getImage().getScaledInstance(100-10, 100-10, Image.SCALE_SMOOTH)));
		floating_factory.setIcon(new ImageIcon(new ImageIcon(getClass().getResource("/images/factory.png")).getImage().getScaledInstance(100-10, 100-10, Image.SCALE_SMOOTH)));
	}
}
