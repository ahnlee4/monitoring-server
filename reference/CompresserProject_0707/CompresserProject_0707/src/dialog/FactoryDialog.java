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
import javax.swing.JDialog;
import javax.swing.JFrame;
import javax.swing.JLabel;
import javax.swing.JOptionPane;
import javax.swing.JPanel;
import javax.swing.JRadioButton;
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

public class FactoryDialog extends JDialog {
	JPanel top_panel, main_panel;

	JLabel title_label, ok_label, cancel_label;
	JPanel panel[] = new JPanel[5];
	JRadioButton button[] = new JRadioButton[5];
	JLabel label[] = new JLabel[5];

	public FactoryDialog() {
		setLayout(new FlowLayout(1, 0, 0));

		setUndecorated(true);
		setAlwaysOnTop(true);
		setDefaultCloseOperation(javax.swing.WindowConstants.HIDE_ON_CLOSE);
		setBackground(new Color(0f, 0f, 0f, 0.6f));

		add(top_panel = new MyPanel(new FlowLayout(0, 0, 0)));
		add(main_panel = new JPanel(new FlowLayout(0, 2, 2)));
		main_panel.setBackground(Color.white);

		main_panel.add(title_label = new MyLabel("공장 변경", 0, MyFont.Font_32, Color.black));

		ActionListener button_listener = new ActionListener() {
			@Override
			public void actionPerformed(ActionEvent e) {
				for (int i = 0; i < button.length; i++) {
					if (e.getSource() == button[i]) {
						AppData.FACTORY_INDEX = i;

						if(AppData.FACTORY_INDEX == 0) AppData.SERVER_IP = AppData.FACTORY_IP_1;
						else if(AppData.FACTORY_INDEX == 1) AppData.SERVER_IP = AppData.FACTORY_IP_2;
						else if(AppData.FACTORY_INDEX == 2) AppData.SERVER_IP = AppData.FACTORY_IP_3;
						else if(AppData.FACTORY_INDEX == 3) AppData.SERVER_IP = AppData.FACTORY_IP_4;
						else if(AppData.FACTORY_INDEX == 4) AppData.SERVER_IP = AppData.FACTORY_IP_5;
					} else {
						button[i].setSelected(false);
					}
				}
			}
		};
		
		MouseListener name_listener = new MouseListener() {
			@Override
			public void mouseReleased(MouseEvent e) {
				for (int i = 0; i < panel.length; i++) {
					if (e.getSource() == panel[i]) {
						NameDialog dialog = new NameDialog(i);
						dialog.show();
					}
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

		String buttons[] = { AppData.FACTORY_1, AppData.FACTORY_2, AppData.FACTORY_3, AppData.FACTORY_4, AppData.FACTORY_5, };
		for (int i = 0; i < buttons.length; i++) {
			main_panel.add(panel[i] = new MyPanel(new FlowLayout(0, 0, 0)));
			panel[i].add(button[i] = new JRadioButton());
			panel[i].add(label[i] = new MyLabel(buttons[i], 2, MyFont.Font_24, Color.black));

			button[i].setHorizontalAlignment(0);
			button[i].setOpaque(false);
			label[i].setFont(MyFont.Font_24);
			label[i].setOpaque(false);
			label[i].setBorder(new LineBorder(MyColor.BLUE_10));

			button[i].addActionListener(button_listener);
			panel[i].addMouseListener(name_listener);

			if (AppData.FACTORY_INDEX == i) {
				button[i].setSelected(true);
			} else {
				button[i].setSelected(false);
			}
		}

		main_panel.add(cancel_label = new MyLabel("닫기", 0, MyFont.Font_24, Color.white));
		main_panel.add(ok_label = new MyLabel("저장", 0, MyFont.Font_24, Color.white));

		ok_label.setBackground(MyColor.BLUE);
		ok_label.setOpaque(true);
		ok_label.addMouseListener(new MouseListener() {
			@Override
			public void mouseReleased(MouseEvent e) {
				AppData.setEncryptedFile();

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

		int main_width = 500;
		int main_height = 400;

		int content_width = 496;
		int content_height = 386;

		title_label.setPreferredSize(new Dimension(content_width, content_height / 7));

		for (int i = 0; i < buttons.length; i++) {
			panel[i].setPreferredSize(new Dimension(content_width, content_height / 7));
			button[i].setPreferredSize(new Dimension((int) (content_width * 0.1), content_height / 7));
			label[i].setPreferredSize(new Dimension((int) (content_width * 0.9), content_height / 7));
		}

		ok_label.setPreferredSize(new Dimension((content_width - 2) / 2, content_height / 7));
		cancel_label.setPreferredSize(new Dimension((content_width - 2) / 2, content_height / 7));

		top_panel.setPreferredSize(new Dimension(width, 300));
		main_panel.setPreferredSize(new Dimension(main_width, main_height));
		main_panel.setBounds(0, 0, main_width, main_height);

		setPreferredSize(new Dimension(width, height));
		setBounds(0, 0, width, height);

		setLocationRelativeTo(null);
	}
}
