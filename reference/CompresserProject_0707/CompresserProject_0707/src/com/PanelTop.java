package com;

import java.awt.Color;
import java.awt.Dimension;
import java.awt.FlowLayout;
import java.awt.GridLayout;
import java.awt.Image;
import java.awt.event.MouseEvent;
import java.awt.event.MouseListener;
import java.text.SimpleDateFormat;
import java.util.Date;

import javax.swing.ImageIcon;
import javax.swing.JLabel;
import javax.swing.JPanel;

import border.RoundedBorder;
import dialog.PasswordDialog;
import utill.AppData;
import utill.MyColor;
import utill.MyFont;

public class PanelTop extends JPanel{
	JPanel top_status, top_presse, top_date, top_lock, top_title, top_logo;
	JLabel top_status_label, top_presse_label, top_date_label, top_version_label, top_lock_label, top_title_label, top_title_label2, top_logo_label;
	ImageIcon logo_image;
	int logo_cnt = 0;
	long logo_time = 0;
	
	public PanelTop(int scale) {
		setLayout(new FlowLayout(0,2,0));

		add(top_status = new JPanel(new GridLayout()));
		add(top_presse = new JPanel(new GridLayout()));
		add(top_date = new JPanel(new GridLayout(2,1,0,0)));
		add(top_lock = new JPanel(new GridLayout()));
		add(top_title = new JPanel(new GridLayout(2,1,0,0)));
		add(top_logo = new JPanel(new GridLayout()));
		
		top_status.add(top_status_label = new JLabel("통합 운전 정지", 0));
		top_presse.add(top_presse_label = new JLabel("압력 : 0.0 bar", 0));
		top_date.add(top_date_label = new JLabel("00/00/00 00:00:00", 0));
		top_date.add(top_version_label = new JLabel("App Ver.240625 / Fw Ver.000000", 0));
		top_lock.add(top_lock_label = new JLabel(new ImageIcon(getClass().getResource("/images/lock.png"))));
		top_title.add(top_title_label = new JLabel("컴프레샤", 0));
		top_title.add(top_title_label2 = new JLabel("통합제어 시스템", 0));
		top_logo.add(top_logo_label = new JLabel());
		
		
		top_logo_label.addMouseListener(new MouseListener() {
			@Override
			public void mouseReleased(MouseEvent e) {
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
				if(System.currentTimeMillis() - logo_time > 5000) {
					logo_cnt = 0;
				}
				logo_cnt++;
				logo_time = System.currentTimeMillis();
				
				if(logo_cnt > 4) {
					logo_cnt = 0;
					PasswordDialog dialog = new PasswordDialog();
					dialog.show();					
				}
			}
		});
		
		top_status.setOpaque(false);
		top_presse.setOpaque(false);
		top_date.setOpaque(false);
		top_lock.setOpaque(false);
		top_title.setOpaque(false);
		top_logo.setOpaque(false);
		
		
		top_status_label.setFont(MyFont.Font_32);
		top_presse_label.setFont(MyFont.Font_32);
		top_date_label.setFont(MyFont.Font_24);
		top_version_label.setFont(MyFont.Font_18);
		top_lock_label.setFont(MyFont.Font_32);
		top_title_label.setFont(MyFont.Font_32);
		top_title_label2.setFont(MyFont.Font_32);
		
		top_status_label.setForeground(Color.white);
		top_presse_label.setForeground(Color.white);
		top_date_label.setForeground(Color.white);
		top_version_label.setForeground(Color.white);
		top_lock_label.setForeground(Color.white);
		top_title_label.setForeground(Color.white);
		top_title_label2.setForeground(Color.white);
		
		top_status.setBorder(new RoundedBorder(MyColor.BLUE_50, 5));
		top_presse.setBorder(new RoundedBorder(MyColor.BLUE_20, 5));
		top_date.setBorder(new RoundedBorder(MyColor.BLUE, 5));
		top_lock.setBorder(new RoundedBorder(MyColor.BLUE_50, 5));
		top_title.setBorder(new RoundedBorder(MyColor.DARK_BLUE, 5));
		
		if(scale == 1920) {
			int width = 364-2;
			int height = 100-2;
			setPreferredSize(new Dimension(1920, 100));
			setSize(1920, 100);
			
			top_status.setPreferredSize(new Dimension(width, height));
			top_presse.setPreferredSize(new Dimension(width, height));
			top_date.setPreferredSize(new Dimension(width, height));
			top_lock.setPreferredSize(new Dimension(98, height));
			top_title.setPreferredSize(new Dimension(width, height));
			top_logo.setPreferredSize(new Dimension(width, height));

			top_lock_label.setIcon(new ImageIcon(new ImageIcon(getClass().getResource("/images/unlock.png")).getImage().getScaledInstance(80, 80, Image.SCALE_DEFAULT)));
			top_logo_label.setIcon(new ImageIcon(new ImageIcon(getClass().getResource("/images/grid_logo3.png")).getImage().getScaledInstance(368, height, Image.SCALE_DEFAULT)));
		}else {
			
		}
		
		setOpaque(false);
	}
	
	public void refresh() {
		top_date_label.setText(new SimpleDateFormat("yy/MM/dd HH:mm:ss").format(new Date()));
		if(AppData.controlModel_00.SERVICE_PRESSURE >= 0x7FFF) {
			top_presse_label.setText("압력 : --- bar");
		}else {
			top_presse_label.setText(String.format("압력 : %.1f bar", AppData.controlModel_00.SERVICE_PRESSURE / 100.0));
		}
		
		
		if((AppData.controlModel_00.TOTAL_RUN_STOP_L_R & 0x01) == 0x01) {
			top_status_label.setText("통합 운전 중");
			top_status.setBorder(new RoundedBorder(MyColor.ORANGE, 5));
		}else {
			top_status_label.setText("통합 운전 정지");
			top_status.setBorder(new RoundedBorder(MyColor.BLUE_50, 5));
		}
		
		String ver = String.format("%d",AppData.controlModel_01.VERSION) + String.format("%04d",AppData.controlModel_01.VERSION_NUM);
		top_version_label.setText(String.format("App Ver.%s / Fw Ver.%s", AppData.VERSION,ver));
	}
}
