package utill;

import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.util.Base64;

import javax.crypto.Cipher;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import javax.crypto.spec.IvParameterSpec;
import javax.crypto.spec.SecretKeySpec;

public class AESCryptoUtil {
	public static String PRIVATE_KEY = "AES_COMPRESS_PROJECT_KEY_2024615";
    public static SecretKey getKey() throws Exception {
        return new SecretKeySpec(PRIVATE_KEY.getBytes("UTF-8"), "AES");
    }
    
    public static IvParameterSpec getIv() {
        return new IvParameterSpec(PRIVATE_KEY.substring(0, 16).getBytes());
    }
    
    public static String encrypt(String specName, SecretKey key, IvParameterSpec iv,
    		String plainText) throws Exception {
		Cipher cipher = Cipher.getInstance(specName);
		cipher.init(Cipher.ENCRYPT_MODE, key, iv);
		byte[] encrypted = cipher.doFinal(plainText.getBytes(StandardCharsets.UTF_8));
		return new String(Base64.getEncoder().encode(encrypted));
	}

	public static String decrypt(String specName, SecretKey key, IvParameterSpec iv,
		String cipherText) throws Exception {
		Cipher cipher = Cipher.getInstance(specName);
		cipher.init(Cipher.DECRYPT_MODE, key, iv); // 모드가 다르다.
		byte[] decrypted = cipher.doFinal(Base64.getDecoder().decode(cipherText));
		return new String(decrypted, StandardCharsets.UTF_8);
	}
}
