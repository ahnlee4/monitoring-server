package border;

import java.awt.Color;
import java.awt.Component;
import java.awt.Graphics;
import java.awt.Insets;

import javax.swing.border.Border;

public class RoundedBorder implements Border {
    private Color color;
    private Color line;
    private int radius;

    public RoundedBorder(Color color, int radius) {
        this.radius = radius;
        this.color = color;
    }
    
    public RoundedBorder(Color color, int radius, Color line) {
        this.radius = radius;
        this.color = color;
        this.line = line;
    }


    public Insets getBorderInsets(Component c) {
        return new Insets(0,0,0,0);
    }


    public boolean isBorderOpaque() {
        return true;
    }


    public void paintBorder(Component c, Graphics g, int x, int y, int width, int height) {
    	if(line != null) {
    		g.setColor(color);
            g.fillRoundRect(x, y, width, height, radius, radius);   
    		g.setColor(line);
            g.drawRoundRect(x, y, width-1, height-1, radius, radius);
    	}else {
    		g.setColor(color);
            g.fillRoundRect(x, y, width-1, height-1, radius, radius);    		
    	}
    }
}
