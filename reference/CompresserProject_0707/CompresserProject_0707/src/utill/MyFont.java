package utill;
import java.awt.Color;
import java.awt.Font;
import java.awt.FontFormatException;
import java.io.IOException;
import java.io.InputStream;

public class MyFont {
	public static Font Font_120 = loadFont("NotoSansKR-Bold.ttf").deriveFont(Font.PLAIN, 120);
	public static Font Font_32 = loadFont("NotoSansKR-Bold.ttf").deriveFont(Font.PLAIN, 32);
	public static Font Font_24 = loadFont("NotoSansKR-Bold.ttf").deriveFont(Font.PLAIN, 24);
	public static Font Font_18 = loadFont("NotoSansKR-Bold.ttf").deriveFont(Font.PLAIN, 18);
	public static Font Font_16 = loadFont("NotoSansKR-Bold.ttf").deriveFont(Font.PLAIN, 16);
	public static Font Font_14 = loadFont("NotoSansKR-Bold.ttf").deriveFont(Font.PLAIN, 14);
	public static Font Font_10 = loadFont("NotoSansKR-Bold.ttf").deriveFont(Font.PLAIN, 10);
	
	private static Font loadFont(String resourceName) {
        try (InputStream inputStream = MyFont.class.getResourceAsStream("/font/" + resourceName)) {
            return Font.createFont(Font.TRUETYPE_FONT, inputStream);
        } catch (IOException | FontFormatException e) {
            throw new RuntimeException("Could not load " + resourceName, e);
        }
    }
}
