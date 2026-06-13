package sub;

import java.awt.BorderLayout;
import java.awt.CardLayout;
import java.awt.Dimension;

import javax.swing.JFrame;
import javax.swing.JPanel;

import com.PanelTop;

import utill.AppData;
import utill.MyColor;

public class FormSub extends JFrame{
	JPanel m_panel;
	PanelTop top_panel; 
	PanelContent content_panel;
	PanelFooter footer_panel;
	
	public FormSub() {
		setLayout(new CardLayout());
		m_panel = new JPanel(new BorderLayout());
		m_panel.setOpaque(true);
		m_panel.setBackground(MyColor.BLUE_5);
		
		m_panel.add(top_panel = new PanelTop(AppData.DISPLAY_SCALE), BorderLayout.NORTH);
		m_panel.add(content_panel = new PanelContent(AppData.DISPLAY_SCALE), BorderLayout.CENTER);
		m_panel.add(footer_panel = new PanelFooter(AppData.DISPLAY_SCALE), BorderLayout.SOUTH);
		
		add(m_panel);

		if(AppData.DISPLAY_SCALE == 1920) {
			setPreferredSize(new Dimension( 1920 , 1080));
			setSize(1920 , 1080);
		}else {
			setPreferredSize(new Dimension( 1280 , 720));
			setSize(1280 , 720);
		}

		setUndecorated(true);
		setDefaultCloseOperation(JFrame.EXIT_ON_CLOSE);

		Thread UiThread = new Thread(new Runnable() {
			@Override
			public void run() {
				try {
					while(true) {
						top_panel.refresh();
						content_panel.refresh();
						footer_panel.refresh();
						
						Thread.sleep(50);
					}
				} catch (Exception e) {
					e.printStackTrace();
				}		
			}
		});
		UiThread.setDaemon(true);
		UiThread.start();
	}
}
