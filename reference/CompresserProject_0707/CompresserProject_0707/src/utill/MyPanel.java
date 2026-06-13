package utill;

import java.awt.Color;
import java.awt.FlowLayout;
import java.awt.Font;
import java.awt.LayoutManager;

import javax.swing.JLabel;
import javax.swing.JPanel;

public class MyPanel extends JPanel{
	public MyPanel() {
		setOpaque(false);
	}

	public MyPanel(LayoutManager layout) {
		setLayout(layout);
		setOpaque(false);
	}
}
