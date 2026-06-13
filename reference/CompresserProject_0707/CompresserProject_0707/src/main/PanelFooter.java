package main;

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
import sub.FormSub;
import utill.AppData;
import utill.MyColor;
import utill.MyFont;
import utill.MyLabel;

public class PanelFooter extends JPanel{
	JPanel mode_panel, control_panel, option_panel, floating_panel;
	JPanel mode_label_panel, control_label_panel, option_label_panel;
	JPanel mode_content_panel, control_content_panel, option_content_panel;
	JPanel mode_set_align_panel, mode_time_align_panel;
	JLabel mode_label, mode_set_align_label, mode_time_align_label, mode_previous_label, mode_next_label, mode_refresh_label;
	JLabel control_label, control_noload_label, control_noload_val_label, control_load_label, control_load_val_label;
	JLabel control_press_label, control_press_val_label, control_unit_label, control_unit_val_label;
	JLabel control_changeTime_label, control_changeTime_val_label, control_time_label, control_time_val_label;
	JLabel option_label;
	JCheckBox options[] = new JCheckBox[16];
	String options_str[] = {"화면 절전 모드", "인버터 기기 부하압력 설정" ,"고장발생시 모드 변경", "인버터 주도 절약운전 기능","교환운전 기능",
			"메인압력모듈 적용","통합운전 제어시 기타 기기 제어","","저압경보 적용",
			"저압경보시 예비기 가동유무","고장발생시 예비기 가동유무","리모트 모드일때만 쓰기",
			"로그인 했을때만 쓰기","데이터 저장유무","통합제어 정지시 컴프레샤 정지안함",
			"교환운전 테스트"};
	JCheckBox ex_option;
	
	JLabel floating_menu, floating_device;
	
	public PanelFooter(int scale) {
		setLayout(new FlowLayout(0,2,0));
		
		//========================= 최상위 레이아웃 ===========================================
		add(mode_panel = new JPanel(new FlowLayout(0,0,0)));
		add(control_panel = new JPanel(new FlowLayout(0,0,0)));
		add(option_panel = new JPanel(new FlowLayout(0,0,0)));
		add(floating_panel = new JPanel(new FlowLayout(0,0,0)));
		
		//========================= 상위 레이아웃 ===========================================		
		mode_panel.add(mode_label_panel = new JPanel(new GridLayout()));
		mode_panel.add(mode_content_panel = new JPanel(new FlowLayout(0,0,0)));
		control_panel.add(control_label_panel = new JPanel(new GridLayout()));
		control_panel.add(control_content_panel = new JPanel(new FlowLayout(0,0,0)));
		option_panel.add(option_label_panel = new JPanel(new GridLayout()));
		option_panel.add(option_content_panel = new JPanel(new GridLayout(0,3)));
		
		//========================= MODE 레이아웃 ===========================================
		mode_label_panel.add(mode_label = new MyLabel("<html><p><b>모<br>드</b></p></html>",0, MyFont.Font_32, Color.white));
		
		mode_content_panel.add(mode_set_align_panel = new JPanel(new GridLayout()));
		mode_content_panel.add(mode_time_align_panel = new JPanel(new GridLayout()));
		mode_content_panel.add(mode_previous_label = new JLabel("", 0));
		mode_content_panel.add(mode_refresh_label = new JLabel("", 0));
		mode_content_panel.add(mode_next_label = new JLabel("", 0));

		mode_set_align_panel.add(mode_set_align_label = new MyLabel("설정순", 0, MyFont.Font_32, Color.white));
		mode_time_align_panel.add(mode_time_align_label = new MyLabel("시간순", 0, MyFont.Font_32, MyColor.BLUE));

		mode_panel.setOpaque(false);
		mode_content_panel.setOpaque(false);

		mode_label_panel.setBorder(new RoundedBorder(MyColor.BLUE_50, 5));
		mode_set_align_panel.setBorder(new RoundedBorder(MyColor.BLUE, 10));
		mode_time_align_panel.setBorder(new RoundedBorder(Color.white, 10, MyColor.BLUE));
		//========================= CONTROL 레이아웃 ===========================================
		control_label_panel.add(control_label = new JLabel("<html><b>통<br>합<br>제<br>어</html>",0));
		
		control_content_panel.add(control_noload_label = new MyLabel("무부하",0, MyFont.Font_24, Color.white));
		control_content_panel.add(control_load_label = new MyLabel("부하",0, MyFont.Font_24, Color.white));
		control_content_panel.add(control_press_label = new MyLabel("압력차",0, MyFont.Font_24, Color.white));
		
		control_content_panel.add(control_noload_val_label = new MyLabel("0.0 bar",0, MyFont.Font_24, Color.BLACK));
		control_content_panel.add(control_load_val_label = new MyLabel("0.0 bar",0, MyFont.Font_24, Color.BLACK));
		control_content_panel.add(control_press_val_label = new MyLabel("0.0 bar",0, MyFont.Font_24, Color.BLACK));
		
		control_content_panel.add(control_unit_label = new MyLabel("가동대수",0, MyFont.Font_24, Color.white));
		control_content_panel.add(control_changeTime_label = new MyLabel("교환운전",0, MyFont.Font_24, Color.white));
		control_content_panel.add(control_time_label = new MyLabel("남은시간",0, MyFont.Font_24, Color.white));
		
		control_content_panel.add(control_unit_val_label = new MyLabel("0 ea",0, MyFont.Font_24, Color.BLACK));
		control_content_panel.add(control_changeTime_val_label = new MyLabel("0 hr",0, MyFont.Font_24, Color.BLACK));
		control_content_panel.add(control_time_val_label = new MyLabel("0 min",0, MyFont.Font_24, Color.BLACK));

		control_panel.setOpaque(false);
		control_content_panel.setOpaque(false);
		
		control_label.setFont(MyFont.Font_32);

		control_label.setForeground(Color.white);
		control_label_panel.setBorder(new RoundedBorder(MyColor.BLUE_50, 5));
		control_noload_label.setBackground(MyColor.BLUE_20);
		control_load_label.setBackground(MyColor.BLUE_20);
		control_press_label.setBackground(MyColor.BLUE_20);
		control_unit_label.setBackground(MyColor.BLUE_20);
		control_changeTime_label.setBackground(MyColor.BLUE_20);
		control_time_label.setBackground(MyColor.BLUE_20);
		
		control_noload_label.setOpaque(true);
		control_load_label.setOpaque(true);
		control_press_label.setOpaque(true);
		control_unit_label.setOpaque(true);
		control_changeTime_label.setOpaque(true);
		control_time_label.setOpaque(true);

		control_noload_val_label.setBorder(new LineBorder(MyColor.BLUE_20, 2));
		control_load_val_label.setBorder(new LineBorder(MyColor.BLUE_20, 2));
		control_press_val_label.setBorder(new LineBorder(MyColor.BLUE_20, 2));
		control_unit_val_label.setBorder(new LineBorder(MyColor.BLUE_20, 2));
		control_changeTime_val_label.setBorder(new LineBorder(MyColor.BLUE_20, 2));
		control_time_val_label.setBorder(new LineBorder(MyColor.BLUE_20, 2));
		//========================= OPTION 레이아웃 ===========================================
		option_label_panel.add(option_label = new JLabel("<html><b>옵<br>션</html>",0));

		options[0] = new JCheckBox(options_str[0]);
		options[1] = new JCheckBox(options_str[1]);
		for(int i=2; i<options.length; i++) {
			if(options_str[i] == "") continue; 
			option_content_panel.add(options[i] = new JCheckBox(options_str[i]));
//			options[i].addActionListener(option_listener);
			options[i].setEnabled(false); 
			options[i].setFont(MyFont.Font_16);
			options[i].setOpaque(false);
		}

		option_panel.setOpaque(false);
		option_content_panel.setOpaque(false);
		
		option_label.setFont(MyFont.Font_32);

		option_label.setForeground(Color.white);
		option_label_panel.setBorder(new RoundedBorder(MyColor.BLUE_50, 5));
		option_content_panel.setBorder(new LineBorder(MyColor.BLUE_20));
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
			
			mode_label_panel.setPreferredSize(new Dimension(label_width-2, height));
			control_label_panel.setPreferredSize(new Dimension(label_width-2, height));
			option_label_panel.setPreferredSize(new Dimension(label_width-2, height));
			
			mode_content_panel.setPreferredSize(new Dimension(mod_width-label_width, height));
			
			mode_set_align_panel.setPreferredSize(new Dimension((mod_width-label_width)/2, height/2));
			mode_time_align_panel.setPreferredSize(new Dimension((mod_width-label_width)/2, height/2));
			mode_previous_label.setPreferredSize(new Dimension((mod_width-label_width)/3, height/2));
			mode_refresh_label.setPreferredSize(new Dimension((mod_width-label_width)/3, height/2));
			mode_next_label.setPreferredSize(new Dimension((mod_width-label_width)/3, height/2));
			
			mode_previous_label.setIcon(new ImageIcon(new ImageIcon(getClass().getResource("/images/arrow_back_ios_new_24dp.png")).getImage().getScaledInstance((mod_width-label_width-2)/3-30, height/2-30, Image.SCALE_SMOOTH)));
			mode_refresh_label.setIcon(new ImageIcon(new ImageIcon(getClass().getResource("/images/refresh_24dp.png")).getImage().getScaledInstance((mod_width-label_width-2)/3-20, height/2-20, Image.SCALE_SMOOTH)));
			mode_next_label.setIcon(new ImageIcon(new ImageIcon(getClass().getResource("/images/arrow_forward_ios_24dp.png")).getImage().getScaledInstance((mod_width-label_width-2)/3-30, height/2-30, Image.SCALE_SMOOTH)));
			
			control_content_panel.setPreferredSize(new Dimension(control_width-label_width, height));
			control_noload_label.setPreferredSize(new Dimension((control_width-label_width)/3, height/6));
			control_load_label.setPreferredSize(new Dimension((control_width-label_width)/3, height/6));
			control_press_label.setPreferredSize(new Dimension((control_width-label_width)/3, height/6));

			control_noload_val_label.setPreferredSize(new Dimension((control_width-label_width)/3, height/3));
			control_load_val_label.setPreferredSize(new Dimension((control_width-label_width)/3, height/3));
			control_press_val_label.setPreferredSize(new Dimension((control_width-label_width)/3, height/3));
			
			control_unit_label.setPreferredSize(new Dimension((control_width-label_width)/3, height/6));
			control_changeTime_label.setPreferredSize(new Dimension((control_width-label_width)/3, height/6));
			control_time_label.setPreferredSize(new Dimension((control_width-label_width)/3, height/6));
			
			control_unit_val_label.setPreferredSize(new Dimension((control_width-label_width)/3, height/3));
			control_changeTime_val_label.setPreferredSize(new Dimension((control_width-label_width)/3, height/3));
			control_time_val_label.setPreferredSize(new Dimension((control_width-label_width)/3, height/3));
			
			option_content_panel.setPreferredSize(new Dimension(option_width-label_width, height));
			
			floating_device.setPreferredSize(new Dimension(floating_width, height/2));
			floating_menu.setPreferredSize(new Dimension(floating_width, height/2));
			floating_device.setIcon(new ImageIcon(new ImageIcon(getClass().getResource("/images/device.png")).getImage().getScaledInstance(floating_width-10, height/2-10, Image.SCALE_SMOOTH)));
			floating_menu.setIcon(new ImageIcon(new ImageIcon(getClass().getResource("/images/menu.png")).getImage().getScaledInstance(floating_width-10, height/2-10, Image.SCALE_SMOOTH)));
		}else {
			
		}
		
		setOpaque(false);
	}
	
	public void refresh() {
		// 모드 정렬 데이터 표시
		if((AppData.controlModel_00.COMP_SORT & 0x01) == 0x01){
			mode_set_align_panel.setBorder(new RoundedBorder(Color.white, 10, MyColor.BLUE));
			mode_set_align_label.setForeground(MyColor.BLUE);	
			
			mode_time_align_panel.setBorder(new RoundedBorder(MyColor.BLUE, 10));
			mode_time_align_label.setForeground(Color.white);
		}else {
			mode_set_align_panel.setBorder(new RoundedBorder(MyColor.BLUE, 10));
			mode_set_align_label.setForeground(Color.white);
			
			mode_time_align_panel.setBorder(new RoundedBorder(Color.white, 10, MyColor.BLUE));
			mode_time_align_label.setForeground(MyColor.BLUE);	
		}
		
		// 통합제어 데이터 표시		
		control_noload_val_label.setText(String.format("%.1f bar", AppData.controlModel_00.UNLOAD_PRESSURE/ 10.0));
		control_load_val_label.setText(String.format("%.1f bar", AppData.controlModel_00.LOAD_PRESSURE/ 10.0));
		control_press_val_label.setText(String.format("%.1f bar", AppData.otherModel_04.DEVICE_PRESS_MAIN/ 10.0));
		
		control_unit_val_label.setText(String.format("%d ea", AppData.controlModel_00.COMP_START_QTY));
		int hr = AppData.controlModel_00.CHANGE_TIME_HOUR - AppData.controlModel_00.CHANGE_TIMER_HOUR;
		int min = 0; 
		if(AppData.controlModel_00.CHANGE_TIMER_MIN != 0) {
			hr = hr - 1;
			min = 60 - AppData.controlModel_00.CHANGE_TIMER_MIN;
		}
		control_changeTime_val_label.setText(String.format("%d hr", hr));
		control_time_val_label.setText(String.format("%d min", min));
		
		// 옵션 데이터 표시
		 
		for(int i=0; i<options.length; i++) {
			if(options_str[i] == "") continue; 
			options[i].setSelected((AppData.controlModel_00.OPTION_DEVICE & options_val[i]) == options_val[i]);
		}

		if(ex_option == null) {
			ex_option = new JCheckBox("인버터 컨트롤 에너지 절약모드");
			option_content_panel.add(ex_option);
			ex_option.setEnabled(false); 
			ex_option.setFont(MyFont.Font_16);
			ex_option.setOpaque(false);
		}
		
		if(((AppData.controlModel_00.OPTION_DEVICE >> 3) & 0x01) == 0x01) {
			ex_option.setVisible(true);
		}else {
			ex_option.setVisible(false);
		}
		ex_option.setSelected(((AppData.controlModel_00.COMP_SORT >> 8) & 0x01) == 0x01);
	}
	
	int options_val[] = {0x01,0x02,0x04,0x08,0x10,0x20,0x40,0x80, 0x100,0x200,0x400,0x800,0x1000,0x2000,0x4000,0x8000};
	
	ActionListener option_listener = new ActionListener() {
		
		@Override
		public void actionPerformed(ActionEvent e) {

			short option_val = 0x00;
			for(int i=0; i<options.length; i++) {
				if(options_str[i] == "") continue;
				if(options[i].isSelected()) option_val = (short) (option_val | options_val[i]);
			}
			
			AppData.socket.sendOption(option_val);
			
		}
	};
}
