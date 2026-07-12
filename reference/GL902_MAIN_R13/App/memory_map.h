#include "stm32f4xx_hal.h"

/* These types must be 8-bit integer */
typedef unsigned char		byte;

/* These types must be 16-bit integer */
typedef unsigned short		word;

/* These types must be 32-bit integer */
typedef unsigned long		dword;

#define  MODBUS_ASCII

#define     UPPER   0
#define     LOWER   1

#ifndef     SET
#define     SET     1
#endif

#ifndef     CLR
#define     CLR     0
#endif

#ifndef     ON
#define     ON     1
#endif

#ifndef     OFF
#define     OFF     0
#endif

#define     POLY    0xA001

#define     FRAM_L     HAL_GPIO_WritePin(GPIOB, GPIO_PIN_0, GPIO_PIN_RESET)
#define     FRAM_H    HAL_GPIO_WritePin(GPIOB, GPIO_PIN_0, GPIO_PIN_SET)

#define     FLASH_L     HAL_GPIO_WritePin(GPIOA, GPIO_PIN_15, GPIO_PIN_RESET)
#define     FLASH_H    HAL_GPIO_WritePin(GPIOA, GPIO_PIN_15, GPIO_PIN_SET)

#define     LED1_OFF     HAL_GPIO_WritePin(GPIOA, GPIO_PIN_6, GPIO_PIN_SET)
#define     LED1_ON     HAL_GPIO_WritePin(GPIOA, GPIO_PIN_6, GPIO_PIN_RESET)

#define     LED2_OFF     HAL_GPIO_WritePin(GPIOD, GPIO_PIN_4, GPIO_PIN_SET)
#define     LED2_ON     HAL_GPIO_WritePin(GPIOD, GPIO_PIN_4, GPIO_PIN_RESET)

#define     LED3_OFF     HAL_GPIO_WritePin(GPIOC, GPIO_PIN_10, GPIO_PIN_SET)
#define     LED3_ON     HAL_GPIO_WritePin(GPIOC, GPIO_PIN_10, GPIO_PIN_RESET)

#define     LED4_OFF     HAL_GPIO_WritePin(GPIOC, GPIO_PIN_9, GPIO_PIN_SET)
#define     LED4_ON     HAL_GPIO_WritePin(GPIOC, GPIO_PIN_9, GPIO_PIN_RESET)

#define     USART1_TX     HAL_GPIO_WritePin(GPIOA, GPIO_PIN_8, GPIO_PIN_SET)
#define     USART1_RX     HAL_GPIO_WritePin(GPIOA, GPIO_PIN_8, GPIO_PIN_RESET)

#define     USART2_TX     HAL_GPIO_WritePin(GPIOD, GPIO_PIN_3, GPIO_PIN_SET)
#define     USART2_RX     HAL_GPIO_WritePin(GPIOD, GPIO_PIN_3, GPIO_PIN_RESET)

#define     USART3_TX     HAL_GPIO_WritePin(GPIOD, GPIO_PIN_7, GPIO_PIN_SET)
#define     USART3_RX     HAL_GPIO_WritePin(GPIOD, GPIO_PIN_7, GPIO_PIN_RESET)

#define     USART4_TX     HAL_GPIO_WritePin(GPIOC, GPIO_PIN_8, GPIO_PIN_SET)
#define     USART4_RX     HAL_GPIO_WritePin(GPIOC, GPIO_PIN_8, GPIO_PIN_RESET)

#define     USART5_TX     HAL_GPIO_WritePin(GPIOA, GPIO_PIN_3, GPIO_PIN_SET)
#define     USART5_RX     HAL_GPIO_WritePin(GPIOA, GPIO_PIN_3, GPIO_PIN_RESET)
/*
#define     USART6_TX     HAL_GPIO_WritePin(GPIOA, GPIO_PIN_8, GPIO_PIN_SET)
#define     USART6_RX     HAL_GPIO_WritePin(GPIOA, GPIO_PIN_8, GPIO_PIN_RESET)

#define     USART7_TX     HAL_GPIO_WritePin(GPIOD, GPIO_PIN_3, GPIO_PIN_SET)
#define     USART7_RX     HAL_GPIO_WritePin(GPIOD, GPIO_PIN_3, GPIO_PIN_RESET)

#define     USART8_TX     HAL_GPIO_WritePin(GPIOD, GPIO_PIN_7, GPIO_PIN_SET)
#define     USART8_RX     HAL_GPIO_WritePin(GPIOD, GPIO_PIN_7, GPIO_PIN_RESET)

#define     USART9_TX     HAL_GPIO_WritePin(GPIOC, GPIO_PIN_8, GPIO_PIN_SET)
#define     USART9_RX     HAL_GPIO_WritePin(GPIOC, GPIO_PIN_8, GPIO_PIN_RESET)

#define     USART10_TX     HAL_GPIO_WritePin(GPIOA, GPIO_PIN_3, GPIO_PIN_SET)
#define     USART10_RX     HAL_GPIO_WritePin(GPIOA, GPIO_PIN_3, GPIO_PIN_RESET)
*/


#define     RELAY1_ON     HAL_GPIO_WritePin(GPIOE, GPIO_PIN_4, GPIO_PIN_SET)
#define     RELAY1_OFF     HAL_GPIO_WritePin(GPIOE, GPIO_PIN_4, GPIO_PIN_RESET)

#define     RELAY2_ON     HAL_GPIO_WritePin(GPIOE, GPIO_PIN_5, GPIO_PIN_SET)
#define     RELAY2_OFF     HAL_GPIO_WritePin(GPIOE, GPIO_PIN_5, GPIO_PIN_RESET)

#define     RELAY3_ON     HAL_GPIO_WritePin(GPIOE, GPIO_PIN_10, GPIO_PIN_SET)
#define     RELAY3_OFF     HAL_GPIO_WritePin(GPIOE, GPIO_PIN_10, GPIO_PIN_RESET)

#define     RELAY4_ON     HAL_GPIO_WritePin(GPIOE, GPIO_PIN_11, GPIO_PIN_SET)
#define     RELAY4_OFF     HAL_GPIO_WritePin(GPIOE, GPIO_PIN_11, GPIO_PIN_RESET)


#define Company_ID       		0x01	//0x01
#define Product_ID       		0x15	//0x01
#define System_Model      		902
#define System_Ver       		22
#define System_VerNum          927

#define WifiDataWriteType     			0xFA
#define FirmwareUpDate_START     	0xFE
#define FirmwareUpDate_ING         	0xFF
#define FirmwareUpDate_END        		0xF0
#define FirmwareUpDate_CLR        		0

#define     UART9_LTE     	9
#define     UART7_LTE     	6

#define     UART6_TEST     	5
#define     UART5_D_IO     	4
#define     UART4_485     	3
#define     UART3_422     	2
#define     UART2_485     	1
#define     UART_GLINK     	0

#define     ADDR_G_LINK    				0x00
#define     ADDR_FIRE_RECEPTION     		0x01
#define     ADDR_FIRE_REMOTE_CONTROL    	0x02
#define     ADDR_UNMANNED_SECURITY     	0x03
#define     ADDR_LTE_MEMORY     			0x04
#define     ADDR_LTE_MEMORY_256     			0x05
#define     ADDR_LTE_MEMORY_512     			0x06

#define     MEM_ADDR_TOTAL     	0x00
#define     MEM_ADDR_SYSTEM     	0x01
#define     MEM_ADDR_TIME     		0xFF

#define     MEM_ADDR_COMP1     	0x11
#define     MEM_ADDR_COMP2     	0x12
#define     MEM_ADDR_COMP3     	0x13
#define     MEM_ADDR_COMP4     	0x14
#define     MEM_ADDR_COMP5     	0x15
#define     MEM_ADDR_COMP6     	0x16
#define     MEM_ADDR_COMP7     	0x17
#define     MEM_ADDR_COMP8     	0x18
#define     MEM_ADDR_COMP9     	0x19
#define     MEM_ADDR_COMP10     	0x1A
#define     MEM_ADDR_COMP11     	0x1B
#define     MEM_ADDR_COMP12     	0x1C

#define     MEM_ADDR_POWER1     	0x31
#define     MEM_ADDR_POWER2     	0x32
#define     MEM_ADDR_POWER3     	0x33
#define     MEM_ADDR_POWER4     	0x34
#define     MEM_ADDR_POWER5     	0x35
#define     MEM_ADDR_POWER6     	0x36
#define     MEM_ADDR_POWER7     	0x37
#define     MEM_ADDR_POWER8     	0x38
#define     MEM_ADDR_POWER9     	0x39
#define     MEM_ADDR_POWER10    	0x3A
#define     MEM_ADDR_POWER11    	0x3B
#define     MEM_ADDR_POWER12    	0x3C

#define     MEM_ADDR_IO_0xE0         0xE0
#define     MEM_ADDR_IO_0xE1         0xE1
#define     MEM_ADDR_IO_0xE2         0xE2
#define     MEM_ADDR_IO_0xE3         0xE3
#define     MEM_ADDR_IO_0xE4         0xE4
#define     MEM_ADDR_IO_0xE5         0xE5
#define     MEM_ADDR_IO_0xE6         0xE6
#define     MEM_ADDR_IO_0xE7         0xE7
#define     MEM_ADDR_IO_0xE8         0xE8
#define     MEM_ADDR_IO_0xE9         0xE9
#define     MEM_ADDR_IO_0xEA         0xEA
#define     MEM_ADDR_IO_0xEB         0xEB
#define     MEM_ADDR_IO_0xEC         0xEC
#define     MEM_ADDR_IO_0xED         0xED
#define     MEM_ADDR_IO_0xEE         0xEE
#define     MEM_ADDR_IO_0xEF         0xEF

#define     MEM_ADDR_20mA_0xF0         0xF0
#define     MEM_ADDR_20mA_0xF1         0xF1
#define     MEM_ADDR_20mA_0xF2         0xF2
#define     MEM_ADDR_20mA_0xF3         0xF3
#define     MEM_ADDR_20mA_0xF4         0xF4
#define     MEM_ADDR_20mA_0xF5         0xF5
#define     MEM_ADDR_20mA_0xF6         0xF6
#define     MEM_ADDR_20mA_0xF7         0xF7
#define     MEM_ADDR_20mA_0xF8         0xF8
#define     MEM_ADDR_20mA_0xF9         0xF9
#define     MEM_ADDR_20mA_0xFA         0xFA
#define     MEM_ADDR_20mA_0xFB         0xFB
#define     MEM_ADDR_20mA_0xFC         0xFC
#define     MEM_ADDR_20mA_0xFD         0xFD
#define     MEM_ADDR_20mA_0xFE         0xFE
#define     MEM_ADDR_20mA_0xFF         0xFF

#define     MICOM_TYPE_COMP1     	0x0001
#define     MICOM_TYPE_COMP2     	0x0002
#define     MICOM_TYPE_COMP3     	0x0004
#define     MICOM_TYPE_COMP4     	0x0008
#define     MICOM_TYPE_COMP5     	0x0010
#define     MICOM_TYPE_COMP6     	0x0020
#define     MICOM_TYPE_COMP7     	0x0040
#define     MICOM_TYPE_COMP8     	0x0080
#define     MICOM_TYPE_COMP9     	0x0100
#define     MICOM_TYPE_COMP10     	0x0200
#define     MICOM_TYPE_COMP11     	0x0400
#define     MICOM_TYPE_COMP12     	0x0800

#define     TOTAL_DATA_ADDRESS    	0
#define     SYSTEM_DATA_ADDRESS    	0x100
#define     EEP_DATA_ADDRESS    		0x200
#define     AI_DATA_ADDRESS    		0x300
#define     PHONE_DATA_ADDRESS    	0x400

#define     SCAN_MAP_0xE0   0x01
#define     SCAN_MAP_0xE1   0x02
#define     SCAN_MAP_0xE2   0x03
#define     SCAN_MAP_0xE3   0x04

#define     SCAN_MAP_0x20   0x10

#define     COMM_G_LINK       0
#define     COMM_MODBUS     1

#define     MCP3427_STATE_STOP  0
#define     MCP3427_STATE_WRITE  1
#define     MCP3427_STATE_READ  2
#define     MCP3427_STATE_ERROR  3

#define BV(bit)			(1<<(bit))		/* bit processing */
#define CLR_Bit(reg,bit)	reg &= ~(BV(bit))
#define SET_Bit(reg,bit)	reg |= (BV(bit))

typedef struct _bit_struct
{
	unsigned char bit0 : 1;
	unsigned char bit1 : 1;
	unsigned char bit2 : 1;
	unsigned char bit3 : 1;
	unsigned char bit4 : 1;
	unsigned char bit5 : 1;
	unsigned char bit6 : 1;
	unsigned char bit7 : 1;
} bit_field;

typedef struct _bit_struct_16
{
	unsigned char bit0 : 1;
	unsigned char bit1 : 1;
	unsigned char bit2 : 1;
	unsigned char bit3 : 1;
	unsigned char bit4 : 1;
	unsigned char bit5 : 1;
	unsigned char bit6 : 1;
	unsigned char bit7 : 1;
	unsigned char bit8 : 1;
	unsigned char bit9 : 1;
	unsigned char bit10 : 1;
	unsigned char bit11 : 1;
	unsigned char bit12 : 1;
	unsigned char bit13 : 1;
	unsigned char bit14 : 1;
	unsigned char bit15 : 1;
} bit_field_16;

// Define macro to get the value of each bit
#define GET_BITFIELD(addr) (*((volatile bit_field*) (addr)))
//-------------------------------------------------------------------------//
typedef union{
	bit_field	BitCtrl;
	byte		ByteCtrl;
}ProgramControl;
//-------------------------------------------------------------------------//

extern ProgramControl _BitControl;
#define BitControl				_BitControl.ByteCtrl	

#define R222_TX_STATUS				_BitControl.BitCtrl.bit0
#define MotorCCWOnOff				_BitControl.BitCtrl.bit1     
#define ExtTrouble					_BitControl.BitCtrl.bit2  	
#define ExtReset						_BitControl.BitCtrl.bit3

extern ProgramControl _sInverterControl;
#define sInverterControl				_sInverterControl.ByteCtrl	

#define sMotorCWOnOff				_sInverterControl.BitCtrl.bit0
#define sMotorCCWOnOff				_sInverterControl.BitCtrl.bit1     
#define sExtTrouble					_sInverterControl.BitCtrl.bit2  	
#define sInverterErr					_sInverterControl.BitCtrl.bit3

//-------------------------------------------------------------------------//
typedef union{
	bit_field_16			BitCtrl16;
	unsigned short		WordCtrl;
}ProgramControl16;
//-------------------------------------------------------------------------//

extern ProgramControl16 _ALARM_L_STATUS;
#define AlarmStatus_WordL					_ALARM_L_STATUS.WordCtrl	

#define 	HeaterOverLoad_Alarm				_ALARM_L_STATUS.BitCtrl16.bit0
#define 	FanOverLoad_Alarm					_ALARM_L_STATUS.BitCtrl16.bit1  	
#define 	FanMotorRunAnswer_Alarm			_ALARM_L_STATUS.BitCtrl16.bit2  	
#define 	OilPumpRunAnswer_Alarm			_ALARM_L_STATUS.BitCtrl16.bit3  	
#define 	OilPump2RunAnswer_Alarm			_ALARM_L_STATUS.BitCtrl16.bit4
#define 	AirFilterUseTime_Alarm				_ALARM_L_STATUS.BitCtrl16.bit5
#define 	OilFilterUseTime_Alarm				_ALARM_L_STATUS.BitCtrl16.bit6
#define 	OilMistFilterUseTime_Alarm			_ALARM_L_STATUS.BitCtrl16.bit7

#define 	OilUseTime_Alarm					_ALARM_L_STATUS.BitCtrl16.bit8
#define 	MotorGressUseTime_Alarm			_ALARM_L_STATUS.BitCtrl16.bit9  	
#define 	P5_AirFilterSenUnConnect_Alarm		_ALARM_L_STATUS.BitCtrl16.bit10  	
#define 	T4_OilTankSenUnConnect_Alarm		_ALARM_L_STATUS.BitCtrl16.bit11  	
#define 	T6_CwInletSenUnConnect_Alarm		_ALARM_L_STATUS.BitCtrl16.bit12
#define 	T7_WacOutSenUnConnect_Alarm		_ALARM_L_STATUS.BitCtrl16.bit13
#define 	T8_WocOutSenUnConnect_Alarm		_ALARM_L_STATUS.BitCtrl16.bit14
#define 	T9_CwOutletSenUnConnect_Alarm		_ALARM_L_STATUS.BitCtrl16.bit15


typedef struct _TICK_INFO_
{
    unsigned long Loop_Cnt;
    unsigned long Ready_Time;
    
    unsigned short Ms60000_Cnt;
    unsigned short Ms1000_Cnt;
    unsigned short Ms500_Cnt;
    unsigned short Ms100_Cnt;
    unsigned short Ms50_Cnt;
    unsigned short Ms10_Cnt;
    unsigned short Usb_Detect_Time;
    
    unsigned char Ms60000_Flag;
    unsigned char Ms1000_Flag;
    unsigned char Ms500_Flag;
    unsigned char Ms100_Flag;
    unsigned char Ms50_Flag;
    unsigned char Ms10_Flag;
    unsigned char Ms1_Flag;
    unsigned short UsbRx_LongCounter;
    unsigned char Update_Rtc;
    unsigned char Enable;
    unsigned char Sec_05Flag;
    
}_TICK_INFO;

extern _TICK_INFO Tick_Info;

typedef struct _KEY_INFO_
{
    unsigned short Hold_Cnt;
    unsigned short Input_State;
    unsigned short Prev_Keyin;
    unsigned short Keyin;
    unsigned char Lock;
    
}_KEY_INFO;
extern _KEY_INFO Ext_Key_Info, Sw_Key_Info;
////////////////////////////////////////////////////////////////////////

typedef struct _EXT_61850_
{
    unsigned short G_LINK_STATUS[5];
    unsigned short FIRE_RECEPTION_STATUS[10];
    unsigned short FIRE_REMOTE_CONTROL_STATUS[4];
    unsigned short UNMANNED_SECURITY[2];
}_EXT_61850;

extern _EXT_61850 EXT_61850_Info, EXT_61850_Info_2, EXT_61850_Info_3;

typedef struct _GLINK_INFO_
{
    unsigned short COMMUNICATION_STATUS;
    unsigned short POWER24_STATUS;
    unsigned short TIMER1;
    unsigned short TIMER2;
    unsigned short SPARE;
}_GLINK_INFO;

extern _GLINK_INFO Glink_info, Glink_info_2, Glink_info_3;


typedef struct _DRYER_INFO_
{
    unsigned short INPUT_STATUS;
    unsigned short OUTPUT_STATUS;
    unsigned short EXT_CMD;
}_DRYER_INFO;

extern _DRYER_INFO DRYER_Info[16], DRYER_Info_2[16], DRYER_Info_3[16];

typedef struct _POWER_INFO_
{
     unsigned char Current_R[4];	//4//4
     unsigned char Current_S[4];	//8
     unsigned char Current_T[4];	//12

     unsigned char Vlotage_R[4];	//16
     unsigned char Vlotage_S[4];	//20
     unsigned char Vlotage_T[4];	//24

     unsigned char Vlotage_RS[4];	//28
     unsigned char Vlotage_ST[4];	//32
     unsigned char Vlotage_TR[4];	//36

     unsigned char Active_Power[4];	//40
     unsigned char ReActive_Power[4];	//44
     unsigned char VA_Power[4];			//48

     unsigned char Active_Energy[4];		//52
     unsigned char ReActive_Energy[4];	//56
     unsigned char VA_Energy[4];		//60

     unsigned char Load_Persent[4];		//64
     unsigned char P_F[4];				//68
     unsigned char Frequency[4];			//72
	
}_POWER_INFO;

extern _POWER_INFO POWER_Info[16], POWER_Info_2[16], POWER_Info_3[16];

typedef struct _IO_INFO_
{
    unsigned short INPUT_STATUS;
    unsigned short OUTPUT_STATUS;
    unsigned short EXT_CMD;
}_IO_INFO;

extern _IO_INFO IO_Info[16], IO_Info_2[16], IO_Info_3[16];

typedef struct _EXT_CH1_
{
    unsigned short INPUT_STATUS[9];
    unsigned short OUTPUT_STATUS;
}_EXT_CH1;

extern _EXT_CH1 EXT_CH1_Info, EXT_CH1_Info_2, EXT_CH1_Info_3;

typedef struct _EXT_CH2_
{
    unsigned short INPUT_STATUS[2];
    unsigned short OUTPUT_STATUS;
}_EXT_CH2;

extern _EXT_CH2 EXT_CH2_Info, EXT_CH2_Info_2, EXT_CH2_Info_3;


typedef struct _AI_INFO_
{
    signed short CH1_DATA;
    signed short CH2_DATA;
    signed short MIN_CH1;
    signed short MAX_CH1;
    signed short MIN_CH2;
    signed short MAX_CH2;
    signed short CAL_CH1;
    signed short CAL_CH2;
	
    signed short LOW_POINT_CH1;
    signed short HIGH_POINT_CH1;
    signed short LOW_POINT_CH2;
    signed short HIGH_POINT_CH2;
	
    signed short DAC_DATA_CH1;
    signed short DAC_DATA_CH2;
    signed short DAC_CAL_CH1;
    signed short DAC_CAL_CH2;
    signed short DAC_CONTROL;
    
}_AI_INFO;

extern _AI_INFO AI_Info[16], AI_Info_2[16],AI_Info_3[16];

typedef struct _MAIN_INFO_
{
    unsigned short IO_Conn;
    unsigned short AI_Conn;
    
    unsigned short Comp_Comm_Type;      // G-LINK or MODBUS
    
    unsigned short Comp_Connect_Cnt[16];
    unsigned short Dio_Connect_Cnt[16];
    unsigned short Ma420_Connect_Cnt[16];
    unsigned long LOW_ALARM_TIME_COUNTER;
    unsigned short comp_device;
    
}_MAIN_INFO;

extern _MAIN_INFO Main_Info;

typedef struct _TOTAL_INFO_
{
    signed short SERVICE_PRESSURE;
    unsigned short COMP_CONNECT;
    unsigned short CHANGE_STOP_DELAY;		//±³È¯¿îÀü Áö¿¬½Ã°£ 
    unsigned short SEL_OILFREE_INJECTION;	//ÀÎÁ§¼Ç =0, ¿ÀÀÏÇÁ¸® =1
    unsigned short SET_VIEW_COMP;		//ÅëÇÕÁ¦¾î È¸¸éÇ¥½Ã¿©ºÎ(Ã¼Å©½Ã Ç¥½Ã¾ÈåÇÔ) 

    unsigned short LOW_ALARM_PRESSURE_LEVEL;
    unsigned short LOW_ALARM_TIME_LEVEL;	
    unsigned short RUN_SEQUENCE_10[4];		//±âµ¿¼ø¼­ 10~12
	
    unsigned short UNLOAD_PRESSURE;
    unsigned short LOAD_PRESSURE;
    unsigned short COMP_PRESSURE_LEVEL;         // Àåºñº° ¾Ð·ÂÂ÷
    unsigned short LOW_ALARM_PRESSURE;          // Àú¾Ð°æº¸ ¾Ð·Â
    
    unsigned short DIO_CONNECT;        	// dio¿¬°á°á»óÅÂ bit
    unsigned short MA420_CONNECT;         // ma¿¬°á°á»óÅÂ bit
    
    unsigned short TOTAL_INDIVIDUAL_MODE;                  // ÅëÇÕ °³º°¿îÀü ¸ðµå
    unsigned short COMP_SORT_MODE;                  // ÄÄÇÁ·¹»þ ÇÏÀ§=0»ç¿ëÀÚ¼ø, 1=»ç¿ë½Ã°£¼ø , »óÀ§ 1=ÀÎ¹öÅÍ ÁÖµµÇü 
    
    unsigned short COMP_START_QTY;           // ±âµ¿¼ö·® ¼³Á¤ ( ¼±¹ß±âµ¿´ë¼ö )
    unsigned short RUN_SEQUENCE[9];		//±âµ¿¼ø¼­ 1~9
    
    unsigned short START_COMP;                  // ¼±¹ßÈ£±â
    
    unsigned short RUN_DELAY_TIME_SEC;          // ±âµ¿Áö¿¬½Ã°£
    
    unsigned short MAIN_PRESS_CHOICE_PART;   // ¸ÞÀÎ¾Ð·Â ¼±ÅÃ 
    
    unsigned short AUTOSTOP_TIME_MIN;           // ÀÚµ¿Á¤Áö
    unsigned short CHANGE_TIME_HOUR;            // ±³È¯¿îÀü ½Ã°£
    
    unsigned short EXT_RUN_STOP;	//¿ÜºÎ¿¡¼­ ÅëÇÕ ¿îÀüÁö·É 
    
    unsigned short CHANGE_TIMER_HOUR;                 // ±³È¯¿îÀü ÅëÇÕÁ¦¾î´©Àû ½Ã°£ 
    unsigned short CHANGE_TIMER_MIN;
	
    unsigned short OPTION_DEVICE;		//dio/ma¿¬°á ´ñ¼ö 
    unsigned short USE_DEVICE;                  //dio/ma¿¬°á ´ñ¼ö 
    unsigned short USE_COMP_QTY;		// ÃâÇÏ½Ã comp ¿¬°á´ñ¼ö 
    unsigned short TOTAL_RUN_STOP_L_R;		            // ÅëÇÕ¿îÀü,Á¤Áö¹× ¤Ó·ÎÄ®/¸®¸ðÆ® ¼³Á¤ 
    unsigned short ALARM_BIT_CONTROL_BIT;
    unsigned short LOW_ALARM_PRESSURE_STEP;
    unsigned short DATA_STORAGE_COMP;	//dataÀúÀåÈ£±â ¼±ÅÃ 
    unsigned short REV_88;
    unsigned short SYSTEM_CONT;
    unsigned short Year_Week;
    unsigned short Month_Date;
    unsigned short Hour_Min;
    unsigned short Seconds;
    
}_TOTAL_INFO;

extern _TOTAL_INFO Total_Info, Total_Info_2, Total_Info_3;

typedef struct _SYSTEM_INFO_
{
    unsigned char   ETH_MAC_ADDRESS[6];
    unsigned char   ETH_SERVER_ADDRESS[4];
    unsigned short  ETH_SERVER_PORT;
    unsigned char   WIFI_MAC_ADDRESS[6];
    unsigned char   WIFI_AP[16];
    unsigned char   WIFI_PASSWORD[16];
    unsigned char   WIFI_SERVER_ADDRESS[4];
    unsigned short  WIFI_SERVER_PORT;
    unsigned char   ETH_WIFI_SELECT;
    unsigned char   DHCP_ON_OFF;
    unsigned char   ETH_LOCAL_ADDRESS[4];
    unsigned char   ETH_LOCAL_SUBNETMASK[4];
    unsigned char   ETH_LOCAL_GATEWAY[4];
    unsigned char   ETH_AUTO_IP_ADDRESS[4];
    unsigned char   WIFI_AUTO_IP_ADDRESS[4];
    unsigned short   DATA_SEND_DUTY;
    unsigned short   GROUP_ID;
    unsigned short   SYSTEM_USER_ID_H;
    unsigned short   SYSTEM_USER_ID;
    unsigned short   COMP_COUNT_QTY;
    unsigned short   MODEL;
    unsigned short  VERSION;
    unsigned short  VERSION_NUM;
    unsigned char   PRODUCT_ID;
    unsigned char   COMPANY_ID;
    unsigned short   DB_SEND_DUTY;
}_SYSTEM_INFO;

extern _SYSTEM_INFO System_Info, System_Info_2, System_Info_3;

typedef struct _COMP_INFO_
{
/*
    signed short SERVICE_PRESSURE;      // 0
    signed short SERVICE_TEMP;
    signed short INV_RPM;
    signed short SERVICE_PRESSURE1;
    signed short SERVICE_TEMP1;
    unsigned short ALARM;               // 10
    unsigned short FAULT_FLG;
    unsigned short FAULT_INV;
    unsigned short OUTPUT_STATUS;
    unsigned short INPUT_STATUS;
    unsigned short COUNT_STATUS;        // 20
    unsigned short CP_STATUS;
    unsigned short RUN_MODE;
    unsigned short EXT_RUN_STOP;
    unsigned short P_MAX_PRESS;
    unsigned short EMER_STOP_PRESSURE;  // 30
    unsigned short INV_TARGET_PRESSURE;
    unsigned short INV_INDIRECT_PRESSURE;
    unsigned short INV_DIRECT_PRESSURE;
    unsigned short UNLOAD_PRESSURE;
    unsigned short LOAD_PRESSURE;
    unsigned short AUTO_STOP_TIME;
    unsigned short AUTO_STOP_DELAY_TIME;
    unsigned short STOP_DELAY_TIME;
    unsigned short VENT_TIME;
    unsigned short YD_CONVERSION_TIME;
    unsigned short RUN_SELECT_MODE;
    unsigned short REMOTE_TYPE;
    unsigned short MANUAL_UNLOAD_MODE;
    unsigned short FAN_ONOFF_MODE;
    unsigned short LOAD_TEMP;
    unsigned short FAN_ON_TEMP;
    unsigned short FAN_OFF_TEMP;
    unsigned short TEMP_ALARM_TEMP;     // 66
    
    unsigned short TEMP_FAULT_TEMP;
    unsigned short ADMIN_PASSWORD;      // 70
    unsigned short GREES_USETIME;
    unsigned short INV_FREQ;
    unsigned short INV_MAX_RPM;
    unsigned short INV_MIN_RPM;
    unsigned short AIRFILTER_USETIME;   // 80
    unsigned short OILFILTER_USETIME;
    unsigned short SEPARATOR_USETIME;
    unsigned short OIL_USETIME;
    unsigned short TOTAL_AIR_FILT_TIME;
    unsigned short TOTAL_OIL_FILT_TIME; // 90
    unsigned short TOTAL_SEPARATOR_TIME;
    unsigned short TOTAL_OIL_TIME;
    unsigned short TOTAL_LOAD_TIME;
    unsigned short TOTAL_UNLOAD_TIME;
    unsigned short TOTAL_AUTOSTOP_TIME; // 100
    unsigned short TOTAL_STOP_TIME;
    unsigned short TOTAL_RUN_TIME_L;
    unsigned short TOTAL_RUN_TIME_H;
    unsigned short TOTAL_RUN_COUNT_L;
    unsigned short TOTAL_RUN_COUNT_H;   // 110
    unsigned short SYSTEM_ID;
    unsigned short MODEL_1;
    unsigned short MODEL_2;
    unsigned short VERSION;
    unsigned short TOTAL_GREES_TIME;           // 120
    unsigned short VERSION_NUM;
    unsigned short SERIAL_YEAR;
    unsigned short SERIAL_LOT;
    unsigned short SERIAL_NUMBER;       // 128

*/
    
    signed short 	SERVICE_PRESSURE;
    signed short 	P2;
    signed short 	P3;
    signed short 	P4;
    signed short 	P5;
    signed short 	P6;
	
    signed short 	T1;
    signed short 	T2;
    signed short 	T3;
    signed short 	T4;
    signed short 	T5;
    signed short 	T6;
    signed short 	T7;
    signed short 	T8;
    signed short 	T9;
    signed short 	T10;
    signed short 	T11;
    signed short 	T12;
    signed short 	T13;
    signed short 	T14;
	
    unsigned short 	mALARM_FLAG;
    unsigned short 	mFAULT_FLG_L;
    unsigned short 	mFAULT_FLG_H;
    unsigned short 	mFAULT_INV;
    unsigned short 	mCP_STATUS;
    unsigned short 	mOUTPUT_STATUS;
    unsigned short 	mINPUT_STATUS;
    unsigned short 	mCOUNT_STATUS;
    unsigned short 	mINV_RPM;
    unsigned short 	mRUN_MODE;
    unsigned short 	mREAL_YEARWEEK;
    unsigned short 	mREAL_MONTHDAY;	
    unsigned short 	mREAL_HOURMIN;
    unsigned short 	mREAL_SEC;
    unsigned short 	mEXT_RUN_STOP;
    unsigned short 	mINV_TargetP;
    unsigned short 	mINV_InDirectP;
    unsigned short 	mINV_DirectP;
    unsigned short 	mEMER_STOP_P;
    unsigned short 	mUNLOAD_P;
	
    unsigned short 	mLOAD_P;
    unsigned short 	mAUTO_STOP_MIN;
    unsigned short 	mOIL_START_SEC;
    unsigned short 	mYD_CONVERSION_SEC;
    unsigned short 	mSYSTEM_ID;
    unsigned short 	mDRIVE_SET_MODE;
    unsigned short 	mMANUAL_UNLOAD_MODE;
    unsigned short 	mREMOTE_TYPE;
    unsigned short 	mTOUT1_FAULT_TEMP;
    unsigned short 	mTOUT2_FAULT_TEMP;
    unsigned short 	mTOIL_FAULT_TEMP;
    unsigned short 	mPMAX_LIMIT;
    unsigned short 	mP2IN_FAULT;
    unsigned short 	mPOIL_FAULT;
    signed short 	mPAIRFILTER_DEF_ALARM;
    unsigned short 	mLOAD_DELAY_SEC;
    unsigned short 	mSTOP_DELAY_SEC;
    unsigned short 	mAIRFILTER_USE_LIMIT;
    unsigned short 	mOILFILTER_USE_LIMIT;
    unsigned short 	mOIL_USE_LIMIT;
	
    unsigned short 	mGRESS_USE_LIMIT;
    signed short 	mLOAD_TEMP;
    unsigned short 	mMODEL_1;
    unsigned short 	mVERSION_1;
    unsigned short 	mVERSION_2;
    unsigned short 	mVERSION_NUM;
    unsigned short 	mINV_FREQ;
    unsigned short 	mINV_MAX_RPM;
    unsigned short 	mINV_MIN_RPM;
    unsigned short 	mTOTAL_AIR_FILT_TIME;
    unsigned short 	mTOTAL_OIL_FILT_TIME;
    unsigned short 	mTOTAL_OIL_TIME;
    unsigned short 	mTOTAL_GRESS_TIME;
    unsigned short 	mTOTAL_UNLOAD_TIME;
    unsigned short 	mTOTAL_LOAD_TIME;
    unsigned short 	mTOTAL_AUTOSTOP_TIME;
    unsigned short 	mTOTAL_STOP_TIME;
    unsigned short 	mTOTAL_RUN_TIME_L;
    unsigned short 	mTOTAL_RUN_TIME_H;
    unsigned short 	mTOTAL_RUN_COUNT_L;
	
    unsigned short 	mTOTAL_RUN_COUNT_H;
    unsigned short 	mSERIAL_YEAR;
    unsigned short 	mEXT_SERVICE_P;

}_COMP_INFO;

extern _COMP_INFO Comp_Info[16], Comp_Info_2[16], Comp_Info_3[16];

typedef struct _TIME_INFO_
{
    unsigned char Year;
    unsigned char Month;
    unsigned char Date;
    unsigned char WeekDay;
    unsigned char Hour;
    unsigned char Min;
    unsigned char Sec;
    
}_TIME_INFO;

extern _TIME_INFO Time_Info;

typedef struct _UART_INFO_
{
    unsigned char Ascii_Tx_Buf[300];
    unsigned char Tx_Buf[600];
    unsigned char Rx_Buf[300];
    unsigned short Rx_Timeout;
    unsigned short Tx_Timeout;
    
    unsigned short Ascii_Tx_Length;
    unsigned short Tx_Length;
    unsigned short rcv_length;
    unsigned short Rx_Cnt;
    unsigned short Link_Time;
    unsigned short Load_Addr;
    unsigned short Load_Buf;
    unsigned short ReapetTimer;

    unsigned char Rcv_Pkt;
    unsigned char Call_Id;
    unsigned char Tx_Enable;
    unsigned char Tx_Repeat;
    unsigned char Ack_Flag;
    unsigned char TxOn_Sig;
	
    unsigned char Ascii_Rx_Buf;
    unsigned char Rx_First_Second;
    unsigned char Ascii_Start;
    unsigned char Tx_On;
	
    unsigned short cal_crc;
    unsigned short rcv_crc;
    
}_UART_INFO;

extern _UART_INFO Uart_Info[10];

typedef struct _PHONE_INFO_
{	
    unsigned char ERR_MSG_SEND_PNUM[5][16];
    unsigned char ACCESS_PNUM[10][16];
    unsigned char ERR_MSG_CONTENTS[2][160];
	
    unsigned short ERR_MSG_SEND_PQTY;
    unsigned short ACCESS_PQTY;
	
    unsigned short USE_DEVICE_QTY;
	
    unsigned short DEVICE_CONNECT;		//conect status
    unsigned short SPARE[4];
    
}_PHONE_INFO;

extern _PHONE_INFO Phone_Info, Phone_Info_2, Phone_Info_3;;

unsigned short crc16(unsigned char *data_p, unsigned short length);
void Reg_Init(void);
