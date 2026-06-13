import main.FormMain;
import sub.FormSub;
import utill.AppData;

public class mainInfo {
	public static void main(String[] args) {
		AppData.init();

		AppData.mainForm = new FormMain();
		AppData.mainForm.setVisible(true);

//		FormSub subForm = new FormSub();
//		subForm.setVisible(true);
	}
}
