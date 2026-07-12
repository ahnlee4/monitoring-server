
/**
  ******************************************************************************
  * @file           : main.c
  * @brief          : Main program body
  ******************************************************************************
  * This notice applies to any and all portions of this file
  * that are not between comment pairs USER CODE BEGIN and
  * USER CODE END. Other portions of this file, whether 
  * inserted by the user or by software development tools
  * are owned by their respective copyright owners.
  *
  * Copyright (c) 2021 STMicroelectronics International N.V. 
  * All rights reserved.
  *
  * Redistribution and use in source and binary forms, with or without 
  * modification, are permitted, provided that the following conditions are met:
  *
  * 1. Redistribution of source code must retain the above copyright notice, 
  *    this list of conditions and the following disclaimer.
  * 2. Redistributions in binary form must reproduce the above copyright notice,
  *    this list of conditions and the following disclaimer in the documentation
  *    and/or other materials provided with the distribution.
  * 3. Neither the name of STMicroelectronics nor the names of other 
  *    contributors to this software may be used to endorse or promote products 
  *    derived from this software without specific written permission.
  * 4. This software, including modifications and/or derivative works of this 
  *    software, must execute solely and exclusively on microcontroller or
  *    microprocessor devices manufactured by or for STMicroelectronics.
  * 5. Redistribution and use of this software other than as permitted under 
  *    this license is void and will automatically terminate your rights under 
  *    this license. 
  *
  * THIS SOFTWARE IS PROVIDED BY STMICROELECTRONICS AND CONTRIBUTORS "AS IS" 
  * AND ANY EXPRESS, IMPLIED OR STATUTORY WARRANTIES, INCLUDING, BUT NOT 
  * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A 
  * PARTICULAR PURPOSE AND NON-INFRINGEMENT OF THIRD PARTY INTELLECTUAL PROPERTY
  * RIGHTS ARE DISCLAIMED TO THE FULLEST EXTENT PERMITTED BY LAW. IN NO EVENT 
  * SHALL STMICROELECTRONICS OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT,
  * INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
  * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, 
  * OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF 
  * LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING 
  * NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE,
  * EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
  *
  ******************************************************************************
  */
/* Includes ------------------------------------------------------------------*/
#include "main.h"
#include "stm32f4xx_hal.h"
#include "usb_host.h"

/* USER CODE BEGIN Includes */

#include "memory_map.h"
#include "delay.h"
#include "fram.h"
#include "sst25vf.h"
#include "uart1.h"
#include "uart2.h"
#include "uart3.h"
#include "uart4.h"
#include "uart5.h"

#include "usbh_core.h"
#include "usbh_msc.h"
#include "fatfs.h"

/* USER CODE END Includes */

/* Private variables ---------------------------------------------------------*/
CAN_HandleTypeDef hcan1;

IWDG_HandleTypeDef hiwdg;

RTC_HandleTypeDef hrtc;

SPI_HandleTypeDef hspi3;

UART_HandleTypeDef huart4;
UART_HandleTypeDef huart5;
UART_HandleTypeDef huart7;
UART_HandleTypeDef huart8;
UART_HandleTypeDef huart9;
UART_HandleTypeDef huart10;
UART_HandleTypeDef huart1;
UART_HandleTypeDef huart2;
UART_HandleTypeDef huart3;
UART_HandleTypeDef huart6;

/* USER CODE BEGIN PV */
/* Private variables ---------------------------------------------------------*/

/* USER CODE END PV */

/* Private function prototypes -----------------------------------------------*/
void SystemClock_Config(void);
static void MX_GPIO_Init(void);
static void MX_USART1_UART_Init(void);
static void MX_USART2_UART_Init(void);
static void MX_USART3_UART_Init(void);
static void MX_UART4_Init(void);
static void MX_UART5_Init(void);
static void MX_USART6_UART_Init(void);
static void MX_UART7_Init(void);
static void MX_UART8_Init(void);
static void MX_UART9_Init(void);
static void MX_UART10_Init(void);
static void MX_SPI3_Init(void);
static void MX_CAN1_Init(void);
static void MX_RTC_Init(void);
static void MX_IWDG_Init(void);
void MX_USB_HOST_Process(void);

/* USER CODE BEGIN PFP */
/* Private function prototypes -----------------------------------------------*/

extern USBH_HandleTypeDef hUsbHostFS;
static FILINFO fno;
DIR dir;

RTC_TimeTypeDef RTC_Time, RTC_Time_Save;
RTC_DateTypeDef RTC_Date, RTC_Date_Save;

/* USER CODE END PFP */

/* USER CODE BEGIN 0 */

//Total_Info.TOTAL_RUN_STOP_L_R
#define TotalRuning_Bit     	0x1000	
#define ToutchEnable_Bit       	0x2000
#define Reset_Bit       			0x4000	
#define DryInput_Bit       		0x8000	

void HAL_SYSTICK_Callback(void)
{
    unsigned short i;
    
    if( Tick_Info.Enable == SET )   return;
    
    Tick_Info.Enable = SET;
	
    if( Tick_Info.Ms60000_Cnt > 0 )     Tick_Info.Ms60000_Cnt--;
    if( Tick_Info.Ms1000_Cnt > 0 )     Tick_Info.Ms1000_Cnt--;
    if( Tick_Info.Ms500_Cnt > 0 )     Tick_Info.Ms500_Cnt--;
    if( Tick_Info.Ms100_Cnt > 0 )     Tick_Info.Ms100_Cnt--;
    if( Tick_Info.Ms50_Cnt > 0 )     Tick_Info.Ms50_Cnt--;
    if( Tick_Info.Ms10_Cnt > 0 )     Tick_Info.Ms10_Cnt--;

    if( Tick_Info.Ms60000_Cnt == 0 )
    {
        Tick_Info.Ms60000_Cnt = 60000;
        Tick_Info.Ms60000_Flag = SET;
    }
    
    if( Tick_Info.Ms1000_Cnt == 0 )
    {
        Tick_Info.Ms1000_Cnt = 1000;
        Tick_Info.Ms1000_Flag = SET;
		

	
    }
    
    if( Tick_Info.Ms500_Cnt == 0 )
    {
        Tick_Info.Ms500_Cnt = 500;
        Tick_Info.Ms500_Flag = SET;
    }
    
    if( Tick_Info.Ms100_Cnt == 0 )
    {
        Tick_Info.Ms100_Cnt = 100;
        Tick_Info.Ms100_Flag = SET;
    }
    
    if( Tick_Info.Ms50_Cnt == 0 )
    {
        Tick_Info.Ms50_Cnt = 50;
        Tick_Info.Ms50_Flag = SET;
    }
    
    if( Tick_Info.Ms10_Cnt == 0 )
    {
        Tick_Info.Ms10_Cnt = 10;
        Tick_Info.Ms10_Flag = SET;
    }
    
    Tick_Info.Ms1_Flag = SET;
    
    if( Tick_Info.Ready_Time > 1 )
        Tick_Info.Ready_Time--;
	
    if((Total_Info.OPTION_DEVICE & 0x0100) && (Total_Info.TOTAL_RUN_STOP_L_R & 0x0001))
    {	
    	if((Total_Info.SERVICE_PRESSURE < ((Total_Info.LOW_ALARM_PRESSURE + Total_Info.LOW_ALARM_PRESSURE_LEVEL ) *10)) && (Total_Info.LOW_ALARM_PRESSURE_STEP < 2))
    	{
    
    		if(Main_Info.LOW_ALARM_TIME_COUNTER) 	Main_Info.LOW_ALARM_TIME_COUNTER--;
    	}
    }
    else
    {
    	Main_Info.LOW_ALARM_TIME_COUNTER = Total_Info.LOW_ALARM_TIME_LEVEL * 60 * 1000;
    }
    
    Tick_Info.Enable = CLR;
    
    Tick_Info.Loop_Cnt++;
    
    for(i=0;i<10;i++)
    {
        if( Uart_Info[i].Rx_Timeout > 0 )      Uart_Info[i].Rx_Timeout--;           	// 수신 타임아웃
        if( Uart_Info[i].Link_Time > 0 )       Uart_Info[i].Link_Time--;            	// 연결상태
        if( Uart_Info[i].Tx_Timeout > 1 )       Uart_Info[i].Tx_Timeout--;    		// 패킷수신 -> 딜레이 -> 송신(응답)
        if(Uart_Info[i].ReapetTimer >1)	Uart_Info[i].ReapetTimer--;
    }
////////////////////////////////////////////////    
    if( Uart_Info[UART_GLINK].Link_Time > 0 ) 
    {
        if( (Tick_Info.Loop_Cnt % 100) > 50 )   LED1_ON;
        else                                    LED1_OFF;
    }    
    else
    {
        if( (Tick_Info.Loop_Cnt % 500) > 250 )   LED1_ON;
        else                                    LED1_OFF;
    }
	
////////////////////////////////////////////////    
    if( Uart_Info[UART3_422].Link_Time > 0 )
    {
        if( (Tick_Info.Loop_Cnt % 100) > 50 )   LED2_ON;
        else                                    LED2_OFF;
    }
    else
    {
        if(Uart_Info[UART3_422].TxOn_Sig){		
		Uart_Info[UART3_422].TxOn_Sig--;	
        	LED2_ON;
        }
	else 
		LED2_OFF;
	
    }
    /////////////////////////////////
    if( Uart_Info[UART5_D_IO].Link_Time > 0 )
    {
        if( (Tick_Info.Loop_Cnt % 100) > 50 )   LED3_ON;
        else                                    LED3_OFF;
    }
    else
    {
        if(Uart_Info[UART5_D_IO].TxOn_Sig){		
		Uart_Info[UART5_D_IO].TxOn_Sig--;	
        	LED3_ON;
        }else 
        	LED3_OFF;
    }
////////////////////////////////////////////////    
    if( Uart_Info[UART4_485].Link_Time > 0 )
    {
        if( (Tick_Info.Loop_Cnt % 100) > 50 )   LED4_ON;
        else                                    LED4_OFF;
    }
    else
    {
        if(Uart_Info[UART4_485].TxOn_Sig){		
		Uart_Info[UART4_485].TxOn_Sig--;	
        	LED4_ON;
        }else 
        	LED4_OFF;
    }
	

}

void HAL_UART_TxCpltCallback(UART_HandleTypeDef *huart)
{
    if( huart->Instance == USART1 )
    {
        USART1_RX;
    }
    if( huart->Instance == USART2 )
    {
        USART2_RX;
    }
    if( huart->Instance == USART3 )
    {
        USART3_RX;	
	 R222_TX_STATUS=CLR;
    }
    if( huart->Instance == UART4 )
    {
        USART4_RX;
    }
    if( huart->Instance == UART5 )
    {
        USART5_RX;
    }
    if( huart->Instance == USART6 )
    {
        ;	//USART6_RX;
    }
    if( huart->Instance == UART7 )
    {
        ;	//USART7_RX;
    }
    if( huart->Instance == UART8 )
    {
        ;	//USART8_RX;
    }
    if( huart->Instance == UART9 )
    {
        ;	//USART9_RX;
    }
    if( huart->Instance == UART10 )
    {
        ;	//USART10_RX;
    }
}

void HAL_RTCEx_RTCEventCallback(void)
{
    	HAL_RTC_GetDate(&hrtc,&RTC_Date,FORMAT_BIN);
    	HAL_RTC_GetTime(&hrtc,&RTC_Time,FORMAT_BIN);
    
}
void Set_Time(void)
{
    RTC_Date.Year = Total_Info.Year_Week >> 8;
    RTC_Date.WeekDay = Total_Info.Year_Week;
    RTC_Date.Month = Total_Info.Month_Date>> 8;
    RTC_Date.Date = Total_Info.Month_Date;
    RTC_Time.Hours = Total_Info.Hour_Min >> 8;
    RTC_Time.Minutes= Total_Info.Hour_Min;
    RTC_Time.Seconds = Total_Info.Seconds;
    
    HAL_RTC_SetDate(&hrtc,&RTC_Date,RTC_FORMAT_BIN);
    HAL_RTC_SetTime(&hrtc,&RTC_Time,RTC_FORMAT_BIN);
    
}

void Total_MainPressSelect_Mode(void)
{
	switch(Total_Info.MAIN_PRESS_CHOICE_PART){		//통합 메닝압력 선택 
		case 0:	Total_Info.SERVICE_PRESSURE=Comp_Info[Total_Info.RUN_SEQUENCE[0] - 1].SERVICE_PRESSURE; 	break;
		case 1:	Total_Info.SERVICE_PRESSURE=AI_Info[0].CH1_DATA; 	break;
		case 2:	Total_Info.SERVICE_PRESSURE=AI_Info[0].CH2_DATA; 	break;
		case 3:	Total_Info.SERVICE_PRESSURE=AI_Info[1].CH1_DATA; 	break;
		case 4:	Total_Info.SERVICE_PRESSURE=AI_Info[1].CH2_DATA; 	break;
		case 5:	Total_Info.SERVICE_PRESSURE=AI_Info[2].CH1_DATA; 	break;
		case 6:	Total_Info.SERVICE_PRESSURE=AI_Info[2].CH2_DATA; 	break;
		case 7:	Total_Info.SERVICE_PRESSURE=AI_Info[3].CH1_DATA; 	break;
		case 8:	Total_Info.SERVICE_PRESSURE=AI_Info[3].CH2_DATA; 	break;
		case 9:	Total_Info.SERVICE_PRESSURE=AI_Info[4].CH1_DATA; 	break;
		case 10:	Total_Info.SERVICE_PRESSURE=AI_Info[4].CH2_DATA; 	break;
		case 11:	Total_Info.SERVICE_PRESSURE=AI_Info[5].CH1_DATA; 	break;
		case 12:	Total_Info.SERVICE_PRESSURE=AI_Info[5].CH2_DATA; 	break;
		case 13:	Total_Info.SERVICE_PRESSURE=AI_Info[6].CH1_DATA; 	break;
		case 14:	Total_Info.SERVICE_PRESSURE=AI_Info[6].CH2_DATA; 	break;
		case 15:	Total_Info.SERVICE_PRESSURE=AI_Info[7].CH1_DATA; 	break;
		case 16:	Total_Info.SERVICE_PRESSURE=AI_Info[7].CH2_DATA; 	break;
		default:
			Total_Info.SERVICE_PRESSURE=Comp_Info[0].SERVICE_PRESSURE; 	break;
	}
}

void Total_AlarmLowPress_Mode(void)
{
	if((Total_Info.SERVICE_PRESSURE !=0x7FFF)&&(Total_Info.SERVICE_PRESSURE !=0xFFFF))
	{
		if((Total_Info.OPTION_DEVICE & 0x0100) && (Total_Info.TOTAL_RUN_STOP_L_R & 0x0001))
		{	//저압경보 동작 
			switch(Total_Info.LOW_ALARM_PRESSURE_STEP)
			{
				case 0:	
					Total_Info.LOW_ALARM_PRESSURE_STEP = 1; 
					Total_Info.ALARM_BIT_CONTROL_BIT &= ~(1 << 0);
					break;
				case 1:	
					if((Total_Info.SERVICE_PRESSURE >= ((Total_Info.LOW_ALARM_PRESSURE + Total_Info.LOW_ALARM_PRESSURE_LEVEL ) *10)) && Main_Info.LOW_ALARM_TIME_COUNTER == 0)
						Total_Info.LOW_ALARM_PRESSURE_STEP = 2; 	
					
					break;
				case 2:	
					if(Total_Info.SERVICE_PRESSURE < (Total_Info.LOW_ALARM_PRESSURE * 10))
					{
						Total_Info.ALARM_BIT_CONTROL_BIT |= 0x0001;	//bit0

						if(Total_Info.OPTION_DEVICE & 0x0200)
							Total_Info.ALARM_BIT_CONTROL_BIT |= 0x0002;	//bit1
						
						Total_Info.LOW_ALARM_PRESSURE_STEP = 3; 
					}
					break;
				case 3:	
					if((Total_Info.ALARM_BIT_CONTROL_BIT & 0x0002)==CLR)
						Total_Info.LOW_ALARM_PRESSURE_STEP = 4; 	
					break;
					
				case 4:	
					if(Total_Info.SERVICE_PRESSURE >= ((Total_Info.LOW_ALARM_PRESSURE + Total_Info.LOW_ALARM_PRESSURE_LEVEL ) *10))	
						Total_Info.LOW_ALARM_PRESSURE_STEP = 5; 	
					break;
				case 5:	
					if((Total_Info.ALARM_BIT_CONTROL_BIT & 0x0001)==CLR)
						Total_Info.LOW_ALARM_PRESSURE_STEP = 2;
					break;
				default:
				
			}

		}
		else 
		{
			Total_Info.LOW_ALARM_PRESSURE_STEP=0;
		}
	}

	if((Total_Info.OPTION_DEVICE & 0x0010)==CLR){
		if(Total_Info.CHANGE_TIMER_MIN)	{				//교환운전 누적시간  초기화 
			Total_Info.CHANGE_TIMER_MIN =0;
			Write_Fram(TOTAL_DATA_ADDRESS + ((unsigned char*)&Total_Info.CHANGE_TIMER_MIN - (unsigned char*)&Total_Info),(unsigned char*)&Total_Info.CHANGE_TIMER_MIN,2);
		}
		if(Total_Info.CHANGE_TIMER_HOUR)	{
			Total_Info.CHANGE_TIMER_HOUR =0;
			Write_Fram(TOTAL_DATA_ADDRESS + ((unsigned char*)&Total_Info.CHANGE_TIMER_HOUR - (unsigned char*)&Total_Info),(unsigned char*)&Total_Info.CHANGE_TIMER_HOUR,2);
		}
		if(Total_Info.ALARM_BIT_CONTROL_BIT & 0x0004)	{
			Total_Info.ALARM_BIT_CONTROL_BIT &= ~(1 << 2);
			Write_Fram(TOTAL_DATA_ADDRESS + ((unsigned char*)&Total_Info.ALARM_BIT_CONTROL_BIT - (unsigned char*)&Total_Info),(unsigned char*)&Total_Info.ALARM_BIT_CONTROL_BIT,2);
		}
	}
}

void Ext_Input_Process(void)
{
    unsigned short word_buf;
    
    if( Ext_Key_Info.Lock == SET )  return;
    
    Ext_Key_Info.Lock = SET;
    
    word_buf = ~GPIOE->IDR & 0xF000;
    
    Ext_Key_Info.Keyin = word_buf;
    
    if( Ext_Key_Info.Keyin == Ext_Key_Info.Prev_Keyin )
    {
        if( Ext_Key_Info.Hold_Cnt < 50 )
        {
            Ext_Key_Info.Hold_Cnt++;
            
            if( Ext_Key_Info.Hold_Cnt == 50 )
                Ext_Key_Info.Input_State = Ext_Key_Info.Keyin;
        }
    }
    else
    {
        Ext_Key_Info.Hold_Cnt = 0;
    }
    
    Ext_Key_Info.Prev_Keyin = Ext_Key_Info.Keyin;
    
    Ext_Key_Info.Lock = CLR;
}

unsigned char Scan_File(char *path)
{
    unsigned long br, bw, addr, size, i;
    char *fn, *p;
    unsigned char fr, state;
    FRESULT res;
    
    //fno.fname = Hex_Info.Lfn_Name;
    //fno.lfsize = 128;
    addr = 0;
    
    res = f_opendir(&dir, path);

    if (res == FR_OK)
    {
        for (;;)
        {
            res = f_readdir(&dir, &fno);
            //g_fno = fno;
            //g_dir = dir;
            if (res != FR_OK || fno.fname[0] == 0) break;
            
            //fn = *fno.lfname ? fno.lfname : fno.fname;
            fn = fno.fname;
            
            if (fno.fattrib & AM_DIR)           // 디렉토리
            {/*
                i = strlen(path);
                sprintf(&path[i], "/%s", fn);
                printf("%s\n", path);
                res = Scan_File(path);
                if (res != FR_OK) break;
                path[i] = 0;*/
            }
            else                                // 파일
            {
                if( strncmp(&fno.altname[9],"HEX",3) == 0 || strncmp(&fno.altname[9],"hex",3) == 0 )        // 확장자 HEX
                {
                    /*
                    if( strncmp(fno.fname,"GL902_",6) == 0 || strncmp(fno.fname,"gl902_",6) == 0 )
                    {
                        break;
                    }*/
                    
                    if( strncmp(fno.fname,"GL902_",6) == 0 )        // 파일명 앞부분 6바이트만 비교. 파일명 앞부분이 GL902_ 이면 진입.
                    {
                        NVIC_SystemReset();                         // 리셋. USB 메모리가 꼽힌 상태로 리셋됨.
                    }
                }
            }
        }
        
        f_closedir(&dir);
    }
    
    return res;
}

void Check_Usb(void)
{
    unsigned char dir_name[32];
    
    if( hUsbHostFS.gState == HOST_CLASS && hUsbHostFS.device.is_connected == 1 )    // 메모리 연결됨.
    {
        if( Tick_Info.Usb_Detect_Time < 65535 ) Tick_Info.Usb_Detect_Time++;
        
        if( Tick_Info.Usb_Detect_Time == 1000 )             // 메모리 연결되고 안정화 시간. 1초후 처리. 1초되는 시점에 1회 동작. 메모리 제거하면 0으로 클리어.
        {
            disk_initialize(0);
            f_mount(&USBHFatFS, (TCHAR const*) USBHPath, 0);
            
            memset(dir_name,0,32);
            
            dir_name[0] = '0';
            dir_name[1] = ':';
            dir_name[2] = 0;
            Scan_File(dir_name);                // USB 드라이브 파일 스캔.
        }
    }
    else
        Tick_Info.Usb_Detect_Time = 0;
}

/* USER CODE END 0 */

/**
  * @brief  The application entry point.
  *
  * @retval None
  */
int main(void)
{
  /* USER CODE BEGIN 1 */

    unsigned long i;
    unsigned char comp_device, io_device, ai_device;
    
  /* USER CODE END 1 */

  /* MCU Configuration----------------------------------------------------------*/

  /* Reset of all peripherals, Initializes the Flash interface and the Systick. */
  HAL_Init();

  /* USER CODE BEGIN Init */

    memset((unsigned char*)&Tick_Info,0,sizeof(Tick_Info));
  
    for(i=0;i<10;i++)   memset((unsigned char*)&Uart_Info,0,sizeof(Uart_Info[i]));
	
    memset((unsigned char*)&Main_Info,0,sizeof(Main_Info));
    memset((unsigned char*)&Ext_Key_Info,0,sizeof(Ext_Key_Info));
    memset((unsigned char*)&Sw_Key_Info,0,sizeof(Sw_Key_Info));
	
    memset((unsigned char*)&Total_Info,0,sizeof(Total_Info));
    memset((unsigned char*)&Total_Info_2,0,sizeof(Total_Info_2));
    memset((unsigned char*)&Total_Info_3,0,sizeof(Total_Info_3));
	
    memset((unsigned char*)&System_Info,0,sizeof(System_Info));
    memset((unsigned char*)&System_Info_2,0,sizeof(System_Info_2));
    memset((unsigned char*)&System_Info_3,0,sizeof(System_Info_3));
	
    for(i=0;i<16;i++)   memset((unsigned char*)&Comp_Info,0,sizeof(Comp_Info[i]));
    for(i=0;i<16;i++)   memset((unsigned char*)&Comp_Info_2,0,sizeof(Comp_Info_2[i]));
    for(i=0;i<16;i++)   memset((unsigned char*)&Comp_Info_3,0,sizeof(Comp_Info_3[i]));

    for(i=0;i<16;i++)   memset((unsigned char*)&POWER_Info,0,sizeof(POWER_Info[i]));
    for(i=0;i<16;i++)   memset((unsigned char*)&POWER_Info_2,0,sizeof(POWER_Info_2[i]));
    for(i=0;i<16;i++)   memset((unsigned char*)&POWER_Info_3,0,sizeof(POWER_Info_3[i]));
    
    for(i=0;i<16;i++)   memset((unsigned char*)&IO_Info,0,sizeof(IO_Info[i]));
    for(i=0;i<16;i++)   memset((unsigned char*)&IO_Info_2,0,sizeof(IO_Info_2[i]));
    for(i=0;i<16;i++)   memset((unsigned char*)&IO_Info_3,0,sizeof(IO_Info_3[i]));
	
    for(i=0;i<16;i++)   memset((unsigned char*)&AI_Info,0,sizeof(AI_Info[i]));
    for(i=0;i<16;i++)   memset((unsigned char*)&AI_Info_2,0,sizeof(AI_Info_2[i]));
    for(i=0;i<16;i++)   memset((unsigned char*)&AI_Info_3,0,sizeof(AI_Info_3[i]));
    
    memset((unsigned char*)&EXT_61850_Info,0,sizeof(EXT_61850_Info));
    memset((unsigned char*)&EXT_61850_Info_2,0,sizeof(EXT_61850_Info_2));
    memset((unsigned char*)&EXT_61850_Info_3,0,sizeof(EXT_61850_Info_3));
	
    memset((unsigned char*)&Glink_info,0,sizeof(Glink_info));
    memset((unsigned char*)&Glink_info_2,0,sizeof(Glink_info_2));
    memset((unsigned char*)&Glink_info_3,0,sizeof(Glink_info_3));
    
    memset((unsigned char*)&EXT_CH1_Info,0,sizeof(EXT_CH1_Info));
    memset((unsigned char*)&EXT_CH1_Info_2,0,sizeof(EXT_CH1_Info_2));
    memset((unsigned char*)&EXT_CH1_Info_3,0,sizeof(EXT_CH1_Info_3));
	
    memset((unsigned char*)&EXT_CH2_Info,0,sizeof(EXT_CH2_Info));
    memset((unsigned char*)&EXT_CH2_Info_2,0,sizeof(EXT_CH2_Info_2));
    memset((unsigned char*)&EXT_CH2_Info_3,0,sizeof(EXT_CH2_Info_3));
	
    memset((unsigned char*)&Phone_Info,0,sizeof(Phone_Info));
    memset((unsigned char*)&Phone_Info_2,0,sizeof(Phone_Info_2));
    memset((unsigned char*)&Phone_Info_3,0,sizeof(Phone_Info_3));

  /* USER CODE END Init */

  /* Configure the system clock */
  SystemClock_Config();

  /* USER CODE BEGIN SysInit */

  /* USER CODE END SysInit */

  /* Initialize all configured peripherals */
  MX_GPIO_Init();
  MX_USART1_UART_Init();
  MX_USB_HOST_Init();
  MX_USART2_UART_Init();
  MX_USART3_UART_Init();
  MX_UART4_Init();
  MX_UART5_Init();
//  MX_USART6_UART_Init();
//  MX_UART7_Init();
//  MX_UART8_Init();
//  MX_UART9_Init();
//  MX_UART10_Init();
  MX_SPI3_Init();
//  MX_CAN1_Init();
  MX_RTC_Init();
  MX_IWDG_Init();           // 와치독
  /* USER CODE BEGIN 2 */

    USART1_RX;
    USART2_RX;
    USART3_RX;
    USART4_RX;
    USART5_RX;
    
    Reg_Init();

    __HAL_UART_ENABLE_IT(&huart1, UART_IT_RXNE);	//G-Link Connection
    __HAL_UART_ENABLE_IT(&huart2, UART_IT_RXNE);	//comp7-12 Connection
    __HAL_UART_ENABLE_IT(&huart3, UART_IT_RXNE);	//dryer Connection
    __HAL_UART_ENABLE_IT(&huart4, UART_IT_RXNE);	//comp1-6 Connection
    __HAL_UART_ENABLE_IT(&huart5, UART_IT_RXNE);	//inn_rs485 Connection
//    __HAL_UART_ENABLE_IT(&huart6, UART_IT_RXNE);	//up board
//   __HAL_UART_ENABLE_IT(&huart7, UART_IT_RXNE);	//up board
//    __HAL_UART_ENABLE_IT(&huart8, UART_IT_RXNE);	//up board
//    __HAL_UART_ENABLE_IT(&huart9, UART_IT_RXNE);	//up board
//    __HAL_UART_ENABLE_IT(&huart10, UART_IT_RXNE);	//rs232(lte)
    
    Tick_Info.Ready_Time = 100;

    Main_Info.Comp_Comm_Type = 0xFFFF;
		
//    Uart_Info[UART2_485].Tx_Timeout=300;
    Uart_Info[UART3_422].Tx_Timeout=300;
    Uart_Info[UART4_485].Tx_Timeout=300;
    Uart_Info[UART5_D_IO].Tx_Timeout=300;
    Uart_Info[UART5_D_IO].Call_Id = 0xFF;
	
    //연결정보 초기화 
    Total_Info.COMP_CONNECT = 0;
    Total_Info.DIO_CONNECT = 0;
    Total_Info.MA420_CONNECT = 0;
	
  /* USER CODE END 2 */

  /* Infinite loop */
  /* USER CODE BEGIN WHILE */
    while (1)
    {

  /* USER CODE END WHILE */
    MX_USB_HOST_Process();

  /* USER CODE BEGIN 3 */

        Uart1_Rx_Process();		//G-Link Connection
        Uart1_Tx_Process();

//        Uart2_Rx_Process();		//comp(7~12) Connection 
//        Uart2_Tx_Process();

        Uart3_Tx_Process();		//power meter Connection
        Uart3_Rx_Process();

        Uart4_Tx_Process();		//comp(1~8) Connection 
        Uart4_Rx_Process();

        Uart5_Tx_Process();		//dio,ai Connection 
        Uart5_Rx_Process();		
		
/*
        Uart6_Rx_Process();		//전시회 판넬 (test)
        Uart6_Tx_Process();

        Uart7_Rx_Process();		//전시회 판넬 (LTE)
        Uart7_Tx_Process();
*/

	if( Tick_Info.Ms1_Flag == SET )
        {
            	Tick_Info.Ms1_Flag = CLR;
			
	     	Ext_Input_Process();
            
            Check_Usb();
//		Set_Time();
				
        }
        
    	if( Tick_Info.Ms10_Flag == SET )
    	{
    		Tick_Info.Ms10_Flag = CLR;

		Total_MainPressSelect_Mode();
		Total_AlarmLowPress_Mode();	

		comp_device = Total_Info.USE_COMP_QTY;
		io_device = (Total_Info.USE_DEVICE >> 0) & 0xFF;
		ai_device = (Total_Info.USE_DEVICE >> 8) & 0xFF;

		for(i=0;i<comp_device;i++)
		{
			if( Main_Info.Comp_Connect_Cnt[i] > 0 )     Total_Info.COMP_CONNECT |= 1 << i;
			else                                        Total_Info.COMP_CONNECT &= ~(1 << i);
		}

		for(i=0;i<io_device;i++)
		{
			if( Main_Info.Dio_Connect_Cnt[i] > 0 )     Total_Info.DIO_CONNECT |= 1 << i;
			else                                        Total_Info.DIO_CONNECT &= ~(1 << i);
		}

		for(i=0;i<ai_device;i++)
		{
			if( Main_Info.Ma420_Connect_Cnt[i] > 0 )     Total_Info.MA420_CONNECT |= 1 << i;
			else                                        Total_Info.MA420_CONNECT &= ~(1 << i);
		}

		if((Total_Info.MA420_CONNECT & 0x0001)==0)
		{
			AI_Info[0].CH1_DATA=0x7fff;	AI_Info[0].CH2_DATA=0x7fff;
		}
		if((Total_Info.MA420_CONNECT & 0x0002)==0)
		{
			AI_Info[1].CH1_DATA=0x7fff;	AI_Info[1].CH2_DATA=0x7fff;
		}
		if((Total_Info.MA420_CONNECT & 0x0004)==0)
		{
			AI_Info[2].CH1_DATA=0x7fff;	AI_Info[2].CH2_DATA=0x7fff;
		}
		if((Total_Info.MA420_CONNECT & 0x0008)==0)
		{
			AI_Info[3].CH1_DATA=0x7fff;	AI_Info[3].CH2_DATA=0x7fff;
		}
    	}
		
    	if( Tick_Info.Ms50_Flag == SET )
    	{
		Tick_Info.Ms50_Flag = CLR;
		HAL_RTCEx_RTCEventCallback();

    	}
		
    	if( Tick_Info.Ms100_Flag == SET )
    	{
    		Tick_Info.Ms100_Flag = CLR;

               __HAL_IWDG_RELOAD_COUNTER(&hiwdg);				

    	}
    	if( Tick_Info.Ms500_Flag == SET )
    	{
    		Tick_Info.Ms500_Flag = CLR;
			
		if(Tick_Info.Sec_05Flag==CLR)	
			Tick_Info.Sec_05Flag=SET;
		else 
			Tick_Info.Sec_05Flag=CLR;

    	}
		
	if(Total_Info.OPTION_DEVICE & 0x8000)
	{
		if( Tick_Info.Ms1000_Flag == SET )
		{
			Tick_Info.Ms1000_Flag = CLR;		        //Memory_copy();

			if(Total_Info.CHANGE_TIME_HOUR)
			{		//교환운전 
				if((Total_Info.OPTION_DEVICE & 0x0010) && (Total_Info.TOTAL_RUN_STOP_L_R & 0x0001) && !(Total_Info.ALARM_BIT_CONTROL_BIT & 0x0004) && !(Total_Info.ALARM_BIT_CONTROL_BIT & 0x0008))
				{
					if(++Total_Info.CHANGE_TIMER_MIN >= 60)
					{
						Total_Info.CHANGE_TIMER_MIN=0;
						if(++Total_Info.CHANGE_TIMER_HOUR >= Total_Info.CHANGE_TIME_HOUR)
						{
							Total_Info.CHANGE_TIMER_HOUR=0;
							Total_Info.ALARM_BIT_CONTROL_BIT |= 0x0004;
						}
						Write_Fram(TOTAL_DATA_ADDRESS + ((unsigned char*)&Total_Info.CHANGE_TIMER_HOUR - (unsigned char*)&Total_Info),(unsigned char*)&Total_Info.CHANGE_TIMER_HOUR,2);
					}
					Write_Fram(TOTAL_DATA_ADDRESS + ((unsigned char*)&Total_Info.CHANGE_TIMER_MIN - (unsigned char*)&Total_Info),(unsigned char*)&Total_Info.CHANGE_TIMER_MIN,2);
				}
			}	
		}

	}
	else
	{
		if( Tick_Info.Ms60000_Flag == SET )
		{
			Tick_Info.Ms60000_Flag = CLR;		        //Memory_copy();

			if(Total_Info.CHANGE_TIME_HOUR)
			{		//교환운전 
				if((Total_Info.OPTION_DEVICE & 0x0010) && (Total_Info.TOTAL_RUN_STOP_L_R & 0x0001) && !(Total_Info.ALARM_BIT_CONTROL_BIT & 0x0004) && !(Total_Info.ALARM_BIT_CONTROL_BIT & 0x0008))
				{
					if(++Total_Info.CHANGE_TIMER_MIN >= 60)
					{
						Total_Info.CHANGE_TIMER_MIN=0;
						if(++Total_Info.CHANGE_TIMER_HOUR >= Total_Info.CHANGE_TIME_HOUR)
						{
							Total_Info.CHANGE_TIMER_HOUR=0;
							Total_Info.ALARM_BIT_CONTROL_BIT |= 0x0004;
						}
						Write_Fram(TOTAL_DATA_ADDRESS + ((unsigned char*)&Total_Info.CHANGE_TIMER_HOUR - (unsigned char*)&Total_Info),(unsigned char*)&Total_Info.CHANGE_TIMER_HOUR,2);
					}
					Write_Fram(TOTAL_DATA_ADDRESS + ((unsigned char*)&Total_Info.CHANGE_TIMER_MIN - (unsigned char*)&Total_Info),(unsigned char*)&Total_Info.CHANGE_TIMER_MIN,2);
				}
			}	
		}
	}
        
    }
  /* USER CODE END 3 */

}

/**
  * @brief System Clock Configuration
  * @retval None
  */
void SystemClock_Config(void)
{

  RCC_OscInitTypeDef RCC_OscInitStruct;
  RCC_ClkInitTypeDef RCC_ClkInitStruct;
  RCC_PeriphCLKInitTypeDef PeriphClkInitStruct;

    /**Configure the main internal regulator output voltage 
    */
  __HAL_RCC_PWR_CLK_ENABLE();

  __HAL_PWR_VOLTAGESCALING_CONFIG(PWR_REGULATOR_VOLTAGE_SCALE1);

    /**Initializes the CPU, AHB and APB busses clocks 
    */
  RCC_OscInitStruct.OscillatorType = RCC_OSCILLATORTYPE_LSI|RCC_OSCILLATORTYPE_HSE;
  RCC_OscInitStruct.HSEState = RCC_HSE_ON;
  RCC_OscInitStruct.LSIState = RCC_LSI_ON;
  RCC_OscInitStruct.PLL.PLLState = RCC_PLL_ON;
  RCC_OscInitStruct.PLL.PLLSource = RCC_PLLSOURCE_HSE;
  RCC_OscInitStruct.PLL.PLLM = 25;
  RCC_OscInitStruct.PLL.PLLN = 192;
  RCC_OscInitStruct.PLL.PLLP = RCC_PLLP_DIV2;
  RCC_OscInitStruct.PLL.PLLQ = 4;
  RCC_OscInitStruct.PLL.PLLR = 2;
  if (HAL_RCC_OscConfig(&RCC_OscInitStruct) != HAL_OK)
  {
    _Error_Handler(__FILE__, __LINE__);
  }

    /**Initializes the CPU, AHB and APB busses clocks 
    */
  RCC_ClkInitStruct.ClockType = RCC_CLOCKTYPE_HCLK|RCC_CLOCKTYPE_SYSCLK
                              |RCC_CLOCKTYPE_PCLK1|RCC_CLOCKTYPE_PCLK2;
  RCC_ClkInitStruct.SYSCLKSource = RCC_SYSCLKSOURCE_PLLCLK;
  RCC_ClkInitStruct.AHBCLKDivider = RCC_SYSCLK_DIV1;
  RCC_ClkInitStruct.APB1CLKDivider = RCC_HCLK_DIV2;
  RCC_ClkInitStruct.APB2CLKDivider = RCC_HCLK_DIV1;

  if (HAL_RCC_ClockConfig(&RCC_ClkInitStruct, FLASH_LATENCY_3) != HAL_OK)
  {
    _Error_Handler(__FILE__, __LINE__);
  }

  PeriphClkInitStruct.PeriphClockSelection = RCC_PERIPHCLK_RTC|RCC_PERIPHCLK_CLK48;
  PeriphClkInitStruct.RTCClockSelection = RCC_RTCCLKSOURCE_LSI;
  PeriphClkInitStruct.Clk48ClockSelection = RCC_CLK48CLKSOURCE_PLLQ;
  if (HAL_RCCEx_PeriphCLKConfig(&PeriphClkInitStruct) != HAL_OK)
  {
    _Error_Handler(__FILE__, __LINE__);
  }

    /**Configure the Systick interrupt time 
    */
  HAL_SYSTICK_Config(HAL_RCC_GetHCLKFreq()/1000);

    /**Configure the Systick 
    */
  HAL_SYSTICK_CLKSourceConfig(SYSTICK_CLKSOURCE_HCLK);

  /* SysTick_IRQn interrupt configuration */
  HAL_NVIC_SetPriority(SysTick_IRQn, 0, 0);
}

/* CAN1 init function */
static void MX_CAN1_Init(void)
{

  hcan1.Instance = CAN1;
  hcan1.Init.Prescaler = 16;
  hcan1.Init.Mode = CAN_MODE_NORMAL;
  hcan1.Init.SyncJumpWidth = CAN_SJW_1TQ;
  hcan1.Init.TimeSeg1 = CAN_BS1_1TQ;
  hcan1.Init.TimeSeg2 = CAN_BS2_1TQ;
  hcan1.Init.TimeTriggeredMode = DISABLE;
  hcan1.Init.AutoBusOff = DISABLE;
  hcan1.Init.AutoWakeUp = DISABLE;
  hcan1.Init.AutoRetransmission = DISABLE;
  hcan1.Init.ReceiveFifoLocked = DISABLE;
  hcan1.Init.TransmitFifoPriority = DISABLE;
  if (HAL_CAN_Init(&hcan1) != HAL_OK)
  {
    _Error_Handler(__FILE__, __LINE__);
  }

}

/* IWDG init function */
static void MX_IWDG_Init(void)
{

  hiwdg.Instance = IWDG;
  hiwdg.Init.Prescaler = IWDG_PRESCALER_256;        // 32000 / 256 = 125
  hiwdg.Init.Reload = 625;                          // 5 초
  if (HAL_IWDG_Init(&hiwdg) != HAL_OK)
  {
    _Error_Handler(__FILE__, __LINE__);
  }

}

/* RTC init function */
static void MX_RTC_Init(void)
{

  /* USER CODE BEGIN RTC_Init 0 */

  /* USER CODE END RTC_Init 0 */

  /* USER CODE BEGIN RTC_Init 1 */

  /* USER CODE END RTC_Init 1 */

    /**Initialize RTC Only 
    */
  hrtc.Instance = RTC;
  hrtc.Init.HourFormat = RTC_HOURFORMAT_24;
  hrtc.Init.AsynchPrediv = 127;
  hrtc.Init.SynchPrediv = 255;
  hrtc.Init.OutPut = RTC_OUTPUT_DISABLE;
  hrtc.Init.OutPutPolarity = RTC_OUTPUT_POLARITY_HIGH;
  hrtc.Init.OutPutType = RTC_OUTPUT_TYPE_OPENDRAIN;
  if (HAL_RTC_Init(&hrtc) != HAL_OK)
  {
    _Error_Handler(__FILE__, __LINE__);
  }
  /* USER CODE BEGIN RTC_Init 2 */

  /* USER CODE END RTC_Init 2 */

}

/* SPI3 init function */
static void MX_SPI3_Init(void)
{

  /* SPI3 parameter configuration*/
  hspi3.Instance = SPI3;
  hspi3.Init.Mode = SPI_MODE_MASTER;
  hspi3.Init.Direction = SPI_DIRECTION_2LINES;
  hspi3.Init.DataSize = SPI_DATASIZE_8BIT;
  hspi3.Init.CLKPolarity = SPI_POLARITY_LOW;
  hspi3.Init.CLKPhase = SPI_PHASE_1EDGE;
  hspi3.Init.NSS = SPI_NSS_SOFT;
  hspi3.Init.BaudRatePrescaler = SPI_BAUDRATEPRESCALER_8;
  hspi3.Init.FirstBit = SPI_FIRSTBIT_MSB;
  hspi3.Init.TIMode = SPI_TIMODE_DISABLE;
  hspi3.Init.CRCCalculation = SPI_CRCCALCULATION_DISABLE;
  hspi3.Init.CRCPolynomial = 10;
  if (HAL_SPI_Init(&hspi3) != HAL_OK)
  {
    _Error_Handler(__FILE__, __LINE__);
  }

}

/* UART4 init function */
static void MX_UART4_Init(void)
{

  huart4.Instance = UART4;
  huart4.Init.BaudRate = 9600;
  huart4.Init.WordLength = UART_WORDLENGTH_8B;
  huart4.Init.StopBits = UART_STOPBITS_1;
  huart4.Init.Parity = UART_PARITY_NONE;
  huart4.Init.Mode = UART_MODE_TX_RX;
  huart4.Init.HwFlowCtl = UART_HWCONTROL_NONE;
  huart4.Init.OverSampling = UART_OVERSAMPLING_16;
  if (HAL_UART_Init(&huart4) != HAL_OK)
  {
    _Error_Handler(__FILE__, __LINE__);
  }

}

/* UART5 init function */
static void MX_UART5_Init(void)
{

  huart5.Instance = UART5;
  huart5.Init.BaudRate = 9600;
  huart5.Init.WordLength = UART_WORDLENGTH_8B;
  huart5.Init.StopBits = UART_STOPBITS_1;
  huart5.Init.Parity = UART_PARITY_NONE;
  huart5.Init.Mode = UART_MODE_TX_RX;
  huart5.Init.HwFlowCtl = UART_HWCONTROL_NONE;
  huart5.Init.OverSampling = UART_OVERSAMPLING_16;
  if (HAL_UART_Init(&huart5) != HAL_OK)
  {
    _Error_Handler(__FILE__, __LINE__);
  }

}

/* UART7 init function */
static void MX_UART7_Init(void)
{

  huart7.Instance = UART7;
  huart7.Init.BaudRate = 38400;
  huart7.Init.WordLength = UART_WORDLENGTH_8B;
  huart7.Init.StopBits = UART_STOPBITS_1;
  huart7.Init.Parity = UART_PARITY_NONE;
  huart7.Init.Mode = UART_MODE_TX_RX;
  huart7.Init.HwFlowCtl = UART_HWCONTROL_NONE;
  huart7.Init.OverSampling = UART_OVERSAMPLING_16;
  if (HAL_UART_Init(&huart7) != HAL_OK)
  {
    _Error_Handler(__FILE__, __LINE__);
  }

}

/* UART8 init function */
static void MX_UART8_Init(void)
{

  huart8.Instance = UART8;
  huart8.Init.BaudRate = 115200;
  huart8.Init.WordLength = UART_WORDLENGTH_8B;
  huart8.Init.StopBits = UART_STOPBITS_1;
  huart8.Init.Parity = UART_PARITY_NONE;
  huart8.Init.Mode = UART_MODE_TX_RX;
  huart8.Init.HwFlowCtl = UART_HWCONTROL_NONE;
  huart8.Init.OverSampling = UART_OVERSAMPLING_16;
  if (HAL_UART_Init(&huart8) != HAL_OK)
  {
    _Error_Handler(__FILE__, __LINE__);
  }

}

/* UART9 init function */
static void MX_UART9_Init(void)
{

  huart9.Instance = UART9;
  huart9.Init.BaudRate = 38400;
  huart9.Init.WordLength = UART_WORDLENGTH_8B;
  huart9.Init.StopBits = UART_STOPBITS_1;
  huart9.Init.Parity = UART_PARITY_NONE;
  huart9.Init.Mode = UART_MODE_TX_RX;
  huart9.Init.HwFlowCtl = UART_HWCONTROL_NONE;
  huart9.Init.OverSampling = UART_OVERSAMPLING_16;
  if (HAL_UART_Init(&huart9) != HAL_OK)
  {
    _Error_Handler(__FILE__, __LINE__);
  }

}

/* UART10 init function */
static void MX_UART10_Init(void)
{

  huart10.Instance = UART10;
  huart10.Init.BaudRate = 115200;
  huart10.Init.WordLength = UART_WORDLENGTH_8B;
  huart10.Init.StopBits = UART_STOPBITS_1;
  huart10.Init.Parity = UART_PARITY_NONE;
  huart10.Init.Mode = UART_MODE_TX_RX;
  huart10.Init.HwFlowCtl = UART_HWCONTROL_NONE;
  huart10.Init.OverSampling = UART_OVERSAMPLING_16;
  if (HAL_UART_Init(&huart10) != HAL_OK)
  {
    _Error_Handler(__FILE__, __LINE__);
  }

}

/* USART1 init function */
static void MX_USART1_UART_Init(void)
{

  huart1.Instance = USART1;
  huart1.Init.BaudRate = 38400;
  huart1.Init.WordLength = UART_WORDLENGTH_8B;
  huart1.Init.StopBits = UART_STOPBITS_1;
  huart1.Init.Parity = UART_PARITY_NONE;
  huart1.Init.Mode = UART_MODE_TX_RX;
  huart1.Init.HwFlowCtl = UART_HWCONTROL_NONE;
  huart1.Init.OverSampling = UART_OVERSAMPLING_16;
  if (HAL_UART_Init(&huart1) != HAL_OK)
  {
    _Error_Handler(__FILE__, __LINE__);
  }

}

/* USART2 init function */
static void MX_USART2_UART_Init(void)
{

  huart2.Instance = USART2;
  huart2.Init.BaudRate = 9600;
  huart2.Init.WordLength = UART_WORDLENGTH_8B;
  huart2.Init.StopBits = UART_STOPBITS_1;
  huart2.Init.Parity = UART_PARITY_NONE;
  huart2.Init.Mode = UART_MODE_TX_RX;
  huart2.Init.HwFlowCtl = UART_HWCONTROL_NONE;
  huart2.Init.OverSampling = UART_OVERSAMPLING_16;
  if (HAL_UART_Init(&huart2) != HAL_OK)
  {
    _Error_Handler(__FILE__, __LINE__);
  }

}

/* USART3 init function */
static void MX_USART3_UART_Init(void)
{

  huart3.Instance = USART3;
  huart3.Init.BaudRate = 19200;
  huart3.Init.WordLength = UART_WORDLENGTH_8B;
  huart3.Init.StopBits = UART_STOPBITS_1;
  huart3.Init.Parity = UART_PARITY_NONE;
  huart3.Init.Mode = UART_MODE_TX_RX;
  huart3.Init.HwFlowCtl = UART_HWCONTROL_NONE;
  huart3.Init.OverSampling = UART_OVERSAMPLING_16;
  if (HAL_UART_Init(&huart3) != HAL_OK)
  {
    _Error_Handler(__FILE__, __LINE__);
  }

}

/* USART6 init function */
static void MX_USART6_UART_Init(void)
{

  huart6.Instance = USART6;
  huart6.Init.BaudRate = 57600;
  huart6.Init.WordLength = UART_WORDLENGTH_8B;
  huart6.Init.StopBits = UART_STOPBITS_1;
  huart6.Init.Parity = UART_PARITY_NONE;
  huart6.Init.Mode = UART_MODE_TX_RX;
  huart6.Init.HwFlowCtl = UART_HWCONTROL_NONE;
  huart6.Init.OverSampling = UART_OVERSAMPLING_16;
  if (HAL_UART_Init(&huart6) != HAL_OK)
  {
    _Error_Handler(__FILE__, __LINE__);
  }

}

/** Configure pins as 
        * Analog 
        * Input 
        * Output
        * EVENT_OUT
        * EXTI
*/
static void MX_GPIO_Init(void)
{

  GPIO_InitTypeDef GPIO_InitStruct;

  /* GPIO Ports Clock Enable */
  __HAL_RCC_GPIOE_CLK_ENABLE();
  __HAL_RCC_GPIOH_CLK_ENABLE();
  __HAL_RCC_GPIOA_CLK_ENABLE();
  __HAL_RCC_GPIOC_CLK_ENABLE();
  __HAL_RCC_GPIOB_CLK_ENABLE();
  __HAL_RCC_GPIOD_CLK_ENABLE();

  /*Configure GPIO pin Output Level */
  HAL_GPIO_WritePin(GPIOE, GPIO_PIN_4|GPIO_PIN_5|GPIO_PIN_10|GPIO_PIN_11, GPIO_PIN_RESET);

  /*Configure GPIO pin Output Level */
  HAL_GPIO_WritePin(GPIOA, GPIO_PIN_3|GPIO_PIN_8|GPIO_PIN_15, GPIO_PIN_RESET);

  /*Configure GPIO pin Output Level */
  HAL_GPIO_WritePin(GPIOA, GPIO_PIN_6, GPIO_PIN_SET);

  /*Configure GPIO pin Output Level */
  HAL_GPIO_WritePin(GPIOB, GPIO_PIN_0, GPIO_PIN_RESET);

  /*Configure GPIO pin Output Level */
  HAL_GPIO_WritePin(GPIOC, GPIO_PIN_8, GPIO_PIN_RESET);

  /*Configure GPIO pin Output Level */
  HAL_GPIO_WritePin(GPIOC, GPIO_PIN_9|GPIO_PIN_10, GPIO_PIN_SET);

  /*Configure GPIO pin Output Level */
  HAL_GPIO_WritePin(GPIOD, GPIO_PIN_3|GPIO_PIN_7, GPIO_PIN_RESET);

  /*Configure GPIO pin Output Level */
  HAL_GPIO_WritePin(GPIOD, GPIO_PIN_4, GPIO_PIN_SET);

  /*Configure GPIO pins : PE4 PE5 PE10 PE11 */
  GPIO_InitStruct.Pin = GPIO_PIN_4|GPIO_PIN_5|GPIO_PIN_10|GPIO_PIN_11;
  GPIO_InitStruct.Mode = GPIO_MODE_OUTPUT_PP;
  GPIO_InitStruct.Pull = GPIO_NOPULL;
  GPIO_InitStruct.Speed = GPIO_SPEED_FREQ_LOW;
  HAL_GPIO_Init(GPIOE, &GPIO_InitStruct);

  /*Configure GPIO pins : PA3 PA8 PA15 */
  GPIO_InitStruct.Pin = GPIO_PIN_3|GPIO_PIN_8|GPIO_PIN_15;
  GPIO_InitStruct.Mode = GPIO_MODE_OUTPUT_PP;
  GPIO_InitStruct.Pull = GPIO_NOPULL;
  GPIO_InitStruct.Speed = GPIO_SPEED_FREQ_LOW;
  HAL_GPIO_Init(GPIOA, &GPIO_InitStruct);

  /*Configure GPIO pin : PA6 */
  GPIO_InitStruct.Pin = GPIO_PIN_6;
  GPIO_InitStruct.Mode = GPIO_MODE_OUTPUT_OD;
  GPIO_InitStruct.Pull = GPIO_NOPULL;
  GPIO_InitStruct.Speed = GPIO_SPEED_FREQ_LOW;
  HAL_GPIO_Init(GPIOA, &GPIO_InitStruct);

  /*Configure GPIO pin : PB0 */
  GPIO_InitStruct.Pin = GPIO_PIN_0;
  GPIO_InitStruct.Mode = GPIO_MODE_OUTPUT_PP;
  GPIO_InitStruct.Pull = GPIO_NOPULL;
  GPIO_InitStruct.Speed = GPIO_SPEED_FREQ_LOW;
  HAL_GPIO_Init(GPIOB, &GPIO_InitStruct);

  /*Configure GPIO pins : PE12 PE13 PE14 PE15 */
  GPIO_InitStruct.Pin = GPIO_PIN_12|GPIO_PIN_13|GPIO_PIN_14|GPIO_PIN_15;
  GPIO_InitStruct.Mode = GPIO_MODE_INPUT;
  GPIO_InitStruct.Pull = GPIO_PULLUP;
  HAL_GPIO_Init(GPIOE, &GPIO_InitStruct);

  /*Configure GPIO pin : PC8 */
  GPIO_InitStruct.Pin = GPIO_PIN_8;
  GPIO_InitStruct.Mode = GPIO_MODE_OUTPUT_PP;
  GPIO_InitStruct.Pull = GPIO_NOPULL;
  GPIO_InitStruct.Speed = GPIO_SPEED_FREQ_LOW;
  HAL_GPIO_Init(GPIOC, &GPIO_InitStruct);

  /*Configure GPIO pins : PC9 PC10 */
  GPIO_InitStruct.Pin = GPIO_PIN_9|GPIO_PIN_10;
  GPIO_InitStruct.Mode = GPIO_MODE_OUTPUT_OD;
  GPIO_InitStruct.Pull = GPIO_NOPULL;
  GPIO_InitStruct.Speed = GPIO_SPEED_FREQ_LOW;
  HAL_GPIO_Init(GPIOC, &GPIO_InitStruct);

  /*Configure GPIO pins : PD3 PD7 */
  GPIO_InitStruct.Pin = GPIO_PIN_3|GPIO_PIN_7;
  GPIO_InitStruct.Mode = GPIO_MODE_OUTPUT_PP;
  GPIO_InitStruct.Pull = GPIO_NOPULL;
  GPIO_InitStruct.Speed = GPIO_SPEED_FREQ_LOW;
  HAL_GPIO_Init(GPIOD, &GPIO_InitStruct);

  /*Configure GPIO pin : PD4 */
  GPIO_InitStruct.Pin = GPIO_PIN_4;
  GPIO_InitStruct.Mode = GPIO_MODE_OUTPUT_OD;
  GPIO_InitStruct.Pull = GPIO_NOPULL;
  GPIO_InitStruct.Speed = GPIO_SPEED_FREQ_LOW;
  HAL_GPIO_Init(GPIOD, &GPIO_InitStruct);

}

/* USER CODE BEGIN 4 */

/* USER CODE END 4 */

/**
  * @brief  This function is executed in case of error occurrence.
  * @param  file: The file name as string.
  * @param  line: The line in file as a number.
  * @retval None
  */
void _Error_Handler(char *file, int line)
{
  /* USER CODE BEGIN Error_Handler_Debug */
  /* User can add his own implementation to report the HAL error return state */
  while(1)
  {
  }
  /* USER CODE END Error_Handler_Debug */
}

#ifdef  USE_FULL_ASSERT
/**
  * @brief  Reports the name of the source file and the source line number
  *         where the assert_param error has occurred.
  * @param  file: pointer to the source file name
  * @param  line: assert_param error line source number
  * @retval None
  */
void assert_failed(uint8_t* file, uint32_t line)
{ 
  /* USER CODE BEGIN 6 */
  /* User can add his own implementation to report the file name and line number,
     tex: printf("Wrong parameters value: file %s on line %d\r\n", file, line) */
  /* USER CODE END 6 */
}
#endif /* USE_FULL_ASSERT */

/**
  * @}
  */

/**
  * @}
  */

/************************ (C) COPYRIGHT STMicroelectronics *****END OF FILE****/
