
#define     FRAM_WREN    0x06
#define     FRAM_WRDI    0x04
#define     FRAM_RDSR    0x05
#define     FRAM_WRSR    0x01
#define     FRAM_READ    0x03
#define     FRAM_WRITE    0x02
#define     FRAM_RDID    0x9F

void Read_Id_Fram(void);
void Fram_Write_Status(unsigned char value);
void Read_Fram(unsigned short addr, unsigned char *pData, unsigned short length);
void Write_Fram(unsigned short addr, unsigned char *pData, unsigned short length);
