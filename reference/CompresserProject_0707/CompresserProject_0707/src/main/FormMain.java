package main;

import java.awt.BorderLayout;
import java.awt.CardLayout;
import java.awt.Color;
import java.awt.Dimension;
import java.awt.FlowLayout;
import java.awt.GridLayout;
import java.io.IOException;
import java.net.UnknownHostException;

import javax.swing.ImageIcon;
import javax.swing.JDialog;
import javax.swing.JFrame;
import javax.swing.JLabel;
import javax.swing.JPanel;

import com.PanelTop;

import utill.AppData;
import utill.TCPSocket;

public class FormMain extends JFrame{
	JPanel m_panel;
	PanelTop top_panel; 
	PanelContent content_panel;
	PanelFooter footer_panel;
	
	
	// tms 서버경로
	// 121.164.120.200:1502;
	// TODO : IP 입력 창(1 ~ 5 개) 
	
	public FormMain() {
		setLayout(new CardLayout());
		m_panel = new JPanel(new BorderLayout());
		m_panel.setOpaque(true);
		m_panel.setBackground(Color.white);
		
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
		
		Thread socketThread = new Thread(new Runnable() {
			@Override
			public void run() {
				while(!AppData.is_connected) {
					if(AppData.socket == null || !AppData.is_connected) {
						try {
							System.out.println("접속 시도");
							AppData.socket = new TCPSocket(AppData.SERVER_IP, AppData.SERVER_PORT);
							if(AppData.socket != null) {
								System.out.println("접속 성공");
								AppData.is_connected = true;	
							}
						} catch (Exception e) {
							continue;
						}	
					}
				}
				
//				try {
//					if(AppData.is_connected && AppData.disDialog != null && AppData.disDialog.isShowing()) {
//						System.out.println("해제");
//						AppData.disDialog.dispose();
//					}
//
//					System.out.println("접속 시도");
//					AppData.socket = new TCPSocket(AppData.SERVER_IP, AppData.SERVER_PORT);
//					if(AppData.socket != null) {
//						if(AppData.disDialog != null && AppData.disDialog.isShowing()) {
//							AppData.disDialog.dispose();
//						}
//						System.out.println("접속 성공");
//						AppData.is_connected = true;
//						while(true) {
//							AppData.socket.mapSend();
//							Thread.sleep(1000);
//							AppData.socket.otherSend();
//							Thread.sleep(1000);
//						}							
//					}
//				} catch (Exception e) {
//					if(AppData.disDialog == null || !AppData.disDialog.isShowing()) {
//						AppData.disDialog = new DisDialog();
//						AppData.disDialog.show();		
//						AppData.is_connected = false;
//					}
//
//					while(true) {
//						try {
//							System.out.println("접속 시도");
//							AppData.socket = new TCPSocket(AppData.SERVER_IP, AppData.SERVER_PORT);
//							if(AppData.socket != null) {
//								if(AppData.disDialog != null && AppData.disDialog.isShowing()) {
//									AppData.disDialog.dispose();
//								}
//								System.out.println("접속 성공");
//								AppData.is_connected = true;
//								break;
//							}							
//						} catch (Exception e2) {
//						}
//					}
//				}		
			}
		});
		socketThread.setDaemon(true);
		socketThread.start();

		Thread readThread = new Thread(new Runnable() {
			@Override
			public void run() {
				while(true) {
					try {
						AppData.socket.mapSend();
						Thread.sleep(1000);
						AppData.socket.otherSend();
						Thread.sleep(1000);
					} catch (Exception e) {
					}
				}		
			}
		});
		readThread.setDaemon(true);
		readThread.start();

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
