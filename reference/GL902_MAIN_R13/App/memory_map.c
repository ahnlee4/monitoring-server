#include "stm32f4xx_hal.h"
#include "memory_map.h"
#include "delay.h"
#include "sst25vf.h"


_TICK_INFO Tick_Info;
_UART_INFO Uart_Info[10];
_MAIN_INFO Main_Info;
_KEY_INFO Ext_Key_Info, Sw_Key_Info;

_TOTAL_INFO Total_Info, Total_Info_2, Total_Info_3;
_SYSTEM_INFO System_Info, System_Info_2, System_Info_3;

_COMP_INFO Comp_Info[16], Comp_Info_2[16], Comp_Info_3[16];
_IO_INFO IO_Info[16], IO_Info_2[16], IO_Info_3[16];
_AI_INFO AI_Info[16], AI_Info_2[16], AI_Info_3[16];

_DRYER_INFO DRYER_Info[16], DRYER_Info_2[16], DRYER_Info_3[16];

_POWER_INFO POWER_Info[16], POWER_Info_2[16], POWER_Info_3[16];

_EXT_61850 EXT_61850_Info, EXT_61850_Info_2, EXT_61850_Info_3;
_GLINK_INFO Glink_info, Glink_info_2, Glink_info_3;

_EXT_CH1 EXT_CH1_Info, EXT_CH1_Info_2, EXT_CH1_Info_3;
_EXT_CH2 EXT_CH2_Info, EXT_CH2_Info_2, EXT_CH2_Info_3;

_PHONE_INFO Phone_Info, Phone_Info_2, Phone_Info_3;

ProgramControl _BitControl;
ProgramControl _sInverterControl;

ProgramControl16 _ALARM_L_STATUS;

void Modbus_Hex_To_Ascii(unsigned char *pData1, unsigned char *pData2, unsigned short length)
{
    unsigned short i;
    unsigned char buf;
    
    for(i=0;i<length;i++)
    {
        buf = pData2[i];
        buf >>= 4;
        if( buf < 10 )   *pData1++ = buf + '0';
        else            *pData1++ = buf - 10 + 'A';
        
        buf = pData2[i] & 0x0F;
        if( buf < 10 )   *pData1++ = buf + '0';
        else            *pData1++ = buf - 10 + 'A';
    }
}

unsigned short crc16(unsigned char *data_p, unsigned short length)
{
    unsigned short i;
    unsigned short data;
    unsigned short crc = 0xffff;
    
    if (length == 0)
        return (~crc);
    
    do
    {
        for (i=0, data=(unsigned char)0xff & *data_p++;
             i < 8; 
             i++, data >>= 1)
        {
              if ((crc & 0x0001) ^ (data & 0x0001))
                    crc = (crc >> 1) ^ POLY;
              else  crc >>= 1;
        }
    } while (--length);
    
    //     crc = ~crc;
    data = crc;
    crc = (crc << 8) | (data >> 8 & 0xff);
    
    return (crc);
}

unsigned char lrc(unsigned char *data_p, unsigned short length)
{
    unsigned short i;
    unsigned short crc;
    
    crc = 0;
    
    for(i=0;i<length;i++)
        crc += *data_p++;
    
    crc = ~crc;
    crc++;
    
    return crc;
}

unsigned long Big_To_Little(unsigned char *pData, unsigned char length)     // 엔디안 변경.
{
    unsigned long long_buf;
    
    if( length == 2 )
    {
        long_buf = *pData++;
        long_buf <<= 8;
        long_buf |= *pData++;
    }
    else if( length == 4 )
    {
        long_buf = *pData++;
        long_buf <<= 8;
        long_buf |= *pData++;
        long_buf <<= 8;
        long_buf |= *pData++;
        long_buf <<= 8;
        long_buf |= *pData++;
    }
    
    return long_buf;
}

void Copy_Buf(unsigned char *pData1, unsigned char *pData2, unsigned char length)
{
    while( length-- )
    {
        *pData2 = *pData1;
        
        pData1++;
        pData2++;
    }
}

unsigned char Check_Data(unsigned char *pData1, unsigned char *pData2, unsigned char length)
{
    unsigned char state;
    
    state = 0;
    
    while( length-- )
    {
        if( *pData1 != *pData2 )
            state = 1;
        
        *pData2 = *pData1;
        
        pData1++;
        pData2++;
    }
    
    return state;
}

void Total_Data_Init(void)
{
    unsigned short word_temp, i;

    Read_Fram(TOTAL_DATA_ADDRESS + 0xFE,(unsigned char*)&word_temp,2);

    if( word_temp == 4958 )
    {
        Read_Fram(TOTAL_DATA_ADDRESS,(unsigned char*)&Total_Info,sizeof(Total_Info));

    	if(Total_Info.LOW_ALARM_PRESSURE_LEVEL==0)	
		Total_Info.LOW_ALARM_PRESSURE_LEVEL=3;
        
        return;
    }

    memset(&Total_Info, 0, sizeof(Total_Info));
    
    word_temp = 4958;
    Write_Fram(TOTAL_DATA_ADDRESS + 0xFE,(unsigned char*)&word_temp,2);                 // 초기화코드 0xFE ~ 0xFF 에 배치. 256 바이트의 제일 마지막.

//    Total_Info.SERVICE_PRESSURE = 0;

    Total_Info.USE_COMP_QTY = 3;		//comp연결대수 
    Total_Info.USE_DEVICE = 0x0101;        // 상위 AI모듈, 하위 DIO 모듈  연결개수 
		
//    Total_Info.COMP_CONNECT = 0x0007;
	    
    Total_Info.UNLOAD_PRESSURE = 80;
    Total_Info.LOAD_PRESSURE = 70;
    Total_Info.COMP_PRESSURE_LEVEL = 3;              // 0.3 bar
    
    Total_Info.LOW_ALARM_PRESSURE = 50;		//5.0 bar
    Total_Info.LOW_ALARM_PRESSURE_LEVEL=3;
    Total_Info.LOW_ALARM_TIME_LEVEL=5;	
    
	
//    Total_Info.DIO_CONNECT = 0;
//    Total_Info.MA420_CONNECT= 0;
    
    Total_Info.TOTAL_INDIVIDUAL_MODE = 1;        // 0=개별 , 1=통합제어
    Total_Info.COMP_SORT_MODE = 0;			//0=호기순, 1=시간순, 상위 =인버터주도형 
    Total_Info.COMP_START_QTY = 2;                // 2 대
    
    for(i=0;i<9;i++)
        Total_Info.RUN_SEQUENCE[i] = i+1;	//RUN_SEQUENCE_1~9
    for(i=0;i<4;i++)
        Total_Info.RUN_SEQUENCE_10[i] =  i+9;		//RUN_SEQUENCE_10~12
	
    Total_Info.START_COMP = 0;              // not use
	
    Total_Info.RUN_DELAY_TIME_SEC = 10;              // 기동지연 시간 설정
    
    Total_Info.MAIN_PRESS_CHOICE_PART = 0;       // 메인 압력적용 선택    
    
    Total_Info.AUTOSTOP_TIME_MIN = 5;			//not use
    
    Total_Info.CHANGE_TIME_HOUR = 72;         // 교환운전시간
        
    Total_Info.CHANGE_TIMER_HOUR = 0;		//교환운전 진행 타이머
    Total_Info.CHANGE_TIMER_MIN = 0;
    
    Total_Info.OPTION_DEVICE = 0x0710;        // bit제어 
    
    Total_Info.TOTAL_RUN_STOP_L_R= 0;		//하위 1=통합운전중 
    Total_Info.ALARM_BIT_CONTROL_BIT= 0;		
    Total_Info.LOW_ALARM_PRESSURE_STEP= 0;		
    Total_Info.DATA_STORAGE_COMP = 1;		
    Total_Info.SYSTEM_CONT = 0;		
    
    Write_Fram(TOTAL_DATA_ADDRESS,(unsigned char*)&Total_Info,sizeof(Total_Info));
}

//////////////////////////////////////////////////////////////////////////
//
// 메모리맵 상위 0x01 초기화
//
//////////////////////////////////////////////////////////////////////////
void System_DaTaType_Init(void)
{
    unsigned short i, word_temp;

    Read_Fram(SYSTEM_DATA_ADDRESS + 0xE0,(unsigned char*)&word_temp,2);        // SYSTEM_DATA_ADDRESS 은 초기화코드를 0xFE(254) 가 아니라 0xE0 에 위치시킨다. 시간메모리맵 0xF0 와 주소 충돌있기때문.
    
    if( word_temp == 4957 )
    {
        Read_Fram(SYSTEM_DATA_ADDRESS,(unsigned char*)&System_Info,sizeof(System_Info));

	System_Info.COMPANY_ID = Company_ID;
	System_Info.PRODUCT_ID = Product_ID;
	System_Info.MODEL = System_Model;
	System_Info.VERSION = System_Ver;
	System_Info.VERSION_NUM = System_VerNum;
        
        return;
    }
    
    memset(&System_Info, 0, sizeof(System_Info));
    
    word_temp = 4957;
    Write_Fram(SYSTEM_DATA_ADDRESS + 0xE0,(unsigned char*)&word_temp,2);
    
    System_Info.ETH_SERVER_ADDRESS[0] = 117;
    System_Info.ETH_SERVER_ADDRESS[1] = 52;
    System_Info.ETH_SERVER_ADDRESS[2] = 91;
    System_Info.ETH_SERVER_ADDRESS[3] = 211;
    
    System_Info.ETH_SERVER_PORT = 7777;
    
    System_Info.ETH_MAC_ADDRESS[0] = 0x70;
    System_Info.ETH_MAC_ADDRESS[1] = 0xC7;
    System_Info.ETH_MAC_ADDRESS[2] = 0x6F;
    System_Info.ETH_MAC_ADDRESS[3] = 0x84;
    System_Info.ETH_MAC_ADDRESS[4] = 0x00;
    System_Info.ETH_MAC_ADDRESS[5] = 0x02;
    
    System_Info.WIFI_SERVER_ADDRESS[0] = 117;
    System_Info.WIFI_SERVER_ADDRESS[1] = 52;
    System_Info.WIFI_SERVER_ADDRESS[2] = 91;
    System_Info.WIFI_SERVER_ADDRESS[3] = 211;
    
    System_Info.WIFI_SERVER_PORT = 7777;
    
    System_Info.WIFI_MAC_ADDRESS[0] = 0x70;
    System_Info.WIFI_MAC_ADDRESS[1] = 0xC7;
    System_Info.WIFI_MAC_ADDRESS[2] = 0x6F;
    System_Info.WIFI_MAC_ADDRESS[3] = 0x84;
    System_Info.WIFI_MAC_ADDRESS[4] = 0x00;
    System_Info.WIFI_MAC_ADDRESS[5] = 0x02;
    
    System_Info.ETH_LOCAL_ADDRESS[0] = 192;
    System_Info.ETH_LOCAL_ADDRESS[1] = 168;
    System_Info.ETH_LOCAL_ADDRESS[2] = 0;
    System_Info.ETH_LOCAL_ADDRESS[3] = 10;
    
    System_Info.ETH_LOCAL_SUBNETMASK[0] = 255;
    System_Info.ETH_LOCAL_SUBNETMASK[1] = 255;
    System_Info.ETH_LOCAL_SUBNETMASK[2] = 254;
    System_Info.ETH_LOCAL_SUBNETMASK[3] = 0;
    
    System_Info.ETH_LOCAL_GATEWAY[0] = 192;
    System_Info.ETH_LOCAL_GATEWAY[1] = 168;
    System_Info.ETH_LOCAL_GATEWAY[2] = 0;
    System_Info.ETH_LOCAL_GATEWAY[3] = 1;
/*    
    for(i=0;i<16;i++)
        System_Info.WIFI_AP[i] = 0;
    
    System_Info.WIFI_AP[0] = 'j';
    System_Info.WIFI_AP[1] = 'h';
    System_Info.WIFI_AP[2] = 'c';
    System_Info.WIFI_AP[3] = 'h';
    System_Info.WIFI_AP[4] = 'o';
    System_Info.WIFI_AP[5] = 'i';
    
    for(i=0;i<16;i++)
        System_Info.WIFI_PASSWORD[i] = 0;
*/    
    System_Info.ETH_WIFI_SELECT = 1;    // 1 = 유선, 2 = 무선
    System_Info.DHCP_ON_OFF = 1;
    System_Info.DATA_SEND_DUTY = 1;
    System_Info.GROUP_ID = 1;
    System_Info.SYSTEM_USER_ID = 1;
    System_Info.COMP_COUNT_QTY = 3;
    
    System_Info.COMPANY_ID = Company_ID;
    System_Info.PRODUCT_ID = Product_ID;
    System_Info.MODEL = System_Model;
    System_Info.VERSION = System_Ver;
    System_Info.VERSION_NUM = System_VerNum;

    Write_Fram(SYSTEM_DATA_ADDRESS,(unsigned char*)&System_Info,sizeof(System_Info));
}

void Phone_DataType_Init(void)
{
    unsigned short word_temp;

    Read_Fram(PHONE_DATA_ADDRESS + 0x2FE,(unsigned char*)&word_temp,2);
        
    if( word_temp == 4957 )
    {
        Read_Fram(PHONE_DATA_ADDRESS,(unsigned char*)&Phone_Info,sizeof(Phone_Info));
            
        return;
    }
    
    memset((unsigned char*)&Phone_Info,0,sizeof(Phone_Info));
    
    memcpy((unsigned char*)&Phone_Info.ERR_MSG_SEND_PNUM[0][0],"01037824957",11);
    
    memcpy((unsigned char*)&Phone_Info.ACCESS_PNUM[0][0],"01011110005",11);

    //Phone_Info.ERR_MSG_CONTENTS[2[160];
	
    Phone_Info.ERR_MSG_SEND_PQTY=1;
    Phone_Info.ACCESS_PQTY=4;
	
    Phone_Info.USE_DEVICE_QTY=1;
	        
    Write_Fram(PHONE_DATA_ADDRESS,(unsigned char*)&Phone_Info,sizeof(Phone_Info));

    word_temp = 4957;
    Write_Fram(PHONE_DATA_ADDRESS + 0x2FE,(unsigned char*)&word_temp,2);                 // 초기화코드 0xFE ~ 0xFF 에 배치. 256 바이트의 제일 마지막.
	
}

void Reg_Init(void)
{
    unsigned short i;

    memset((unsigned char*)&Tick_Info,0,sizeof(Tick_Info));
    memset((unsigned char*)&Main_Info,0,sizeof(Main_Info));
    memset((unsigned char*)&Uart_Info,0,sizeof(Uart_Info));
	
    memset((unsigned char*)&Total_Info,0,sizeof(Total_Info));	
    memset((unsigned char*)&System_Info,0,sizeof(System_Info));	
    memset((unsigned char*)&Comp_Info,0,sizeof(Comp_Info));		
    memset((unsigned char*)&AI_Info,0,sizeof(AI_Info));	
    memset((unsigned char*)&IO_Info,0,sizeof(IO_Info));	
	
    Total_Data_Init();
    System_DaTaType_Init();
    Phone_DataType_Init();

  memset((unsigned char*)&Phone_Info.ERR_MSG_CONTENTS[0][0],0,sizeof(Phone_Info.ERR_MSG_CONTENTS));
	
    
}
