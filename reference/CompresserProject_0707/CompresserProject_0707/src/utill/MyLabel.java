package utill;

import java.awt.Color;
import java.awt.Font;

import javax.swing.JLabel;

public class MyLabel extends JLabel{
    public MyLabel(String text, int horizontalAlignment) {
    	super(text, null, horizontalAlignment);
    }
    public MyLabel(String text, int horizontalAlignment, Font font, Color color) {
    	super(text, null, horizontalAlignment);
    	setFont(font);
    	setForeground(color);
    }
}
