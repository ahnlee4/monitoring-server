
#define		SCK_H		        GPIOB->BSRRL = GPIO_Pin_3
#define		SCK_L		        GPIOB->BSRRH = GPIO_Pin_3

#define		MOSI_H		        GPIOB->BSRRL = GPIO_Pin_5
#define		MOSI_L		        GPIOB->BSRRH = GPIO_Pin_5

#define         MISO                    GPIOB->IDR & GPIO_Pin_4

extern unsigned char sst25_id[3];

void sst25vf_id_read(void);
unsigned char sst25vf_status_read(void);
void sst25vf_status_write(unsigned char value);
void sst25vf_erase_4k(unsigned long addr);
void sst25vf_erase_32k(unsigned long addr);
void sst25vf_erase_64k(unsigned long addr);
void sst25vf_write_enable(void);
void sst25vf_write_byte(unsigned long addr, unsigned char value);
void sst25vf_write_str(unsigned long addr, unsigned char *pData, unsigned long length);
void sst25vf_read_byte(unsigned long addr, unsigned char *pBuf, unsigned long length);
void sst25vf_read_str(unsigned long addr, unsigned char *pBuf, unsigned long length);
