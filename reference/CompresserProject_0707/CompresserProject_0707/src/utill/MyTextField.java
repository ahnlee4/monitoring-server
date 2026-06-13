package utill;

import java.awt.Color;
import java.awt.Font;

import javax.swing.JLabel;
import javax.swing.JTextField;

public class MyTextField extends JTextField{
    public MyTextField(String text, int horizontalAlignment) {
    	super(text);
    }
    public MyTextField(String text, int horizontalAlignment, Font font, Color color) {
    	super(text);
    	setHorizontalAlignment(horizontalAlignment);
    	setFont(font);
    	setForeground(color);
    }
}
