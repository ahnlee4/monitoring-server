#include "stm32f4xx_hal.h"
#include "memory_map.h"
#include "delay.h"
#include "uart7.h"

extern UART_HandleTypeDef huart7;

void USART7_ISR(void)
{
    unsigned short rcv_length;
    unsigned char RxData;

    if( Uart_Info[UART7_LTE].Rx_Timeout == 0 )   Uart_Info[UART7_LTE].Rx_Cnt = 0;
    if( Uart_Info[UART7_LTE].Rx_Cnt > 255 )   Uart_Info[UART7_LTE].Rx_Cnt = 0;
    
    RxData = UART7->DR;

    if(Uart_Info[UART7_LTE].Rx_Timeout == 0 && RxData == 0x01 )			// ID 검사
    {
        Uart_Info[UART7_LTE].Rx_Buf[Uart_Info[UART7_LTE].Rx_Cnt++] = RxData;
    }
    else if( Uart_Info[UART7_LTE].Rx_Cnt == 1 && (RxData == 0x10 || RxData == 0x03 || RxData == 0x06) )					// 쓰기, 읽기 명령
    {
        Uart_Info[UART7_LTE].Rx_Buf[Uart_Info[UART7_LTE].Rx_Cnt++] = RxData;
    }
    else if( Uart_Info[UART7_LTE].Rx_Cnt == 2 )					// 상위 주소
    {
        Uart_Info[UART7_LTE].Rx_Buf[Uart_Info[UART7_LTE].Rx_Cnt++] = RxData;
    }
    else if( Uart_Info[UART7_LTE].Rx_Cnt == 3 )					// 하위 주소
    {
        Uart_Info[UART7_LTE].Rx_Buf[Uart_Info[UART7_LTE].Rx_Cnt++] = RxData;
    }
    else if( Uart_Info[UART7_LTE].Rx_Cnt == 4 )					// 데이터 길이
    {
        Uart_Info[UART7_LTE].Rx_Buf[Uart_Info[UART7_LTE].Rx_Cnt++] = RxData;
    }
    else if( Uart_Info[UART7_LTE].Rx_Cnt == 5 )					// 데이터 길이
    {
        Uart_Info[UART7_LTE].Rx_Buf[Uart_Info[UART7_LTE].Rx_Cnt++] = RxData;
    }
    else if( Uart_Info[UART7_LTE].Rx_Cnt >= 6 && Uart_Info[UART7_LTE].Rx_Buf[1] == 0x03 )	// 읽기
    {
        Uart_Info[UART7_LTE].Rx_Buf[Uart_Info[UART7_LTE].Rx_Cnt++] = RxData;

        if( Uart_Info[UART7_LTE].Rx_Cnt == 8 )
            Uart_Info[UART7_LTE].Rcv_Pkt = SET;
    }
    else if( Uart_Info[UART7_LTE].Rx_Cnt >= 6 && Uart_Info[UART7_LTE].Rx_Buf[1] == 0x06 )	// 쓰기
    {
        Uart_Info[UART7_LTE].Rx_Buf[Uart_Info[UART7_LTE].Rx_Cnt++] = RxData;

        if( Uart_Info[UART7_LTE].Rx_Cnt == 8 )
        {
            Uart_Info[UART7_LTE].Rcv_Pkt = SET;
        }
    }
    else if( Uart_Info[UART7_LTE].Rx_Cnt >= 6 && Uart_Info[UART7_LTE].Rx_Buf[1] == 0x10 )	// 쓰기
    {
        rcv_length = Uart_Info[UART7_LTE].Rx_Buf[6];

        Uart_Info[UART7_LTE].Rx_Buf[Uart_Info[UART7_LTE].Rx_Cnt++] = RxData;

        if( Uart_Info[UART7_LTE].Rx_Cnt == (7 + rcv_length + 2) )		// 헤더 + 데이터 + CRC
            Uart_Info[UART7_LTE].Rcv_Pkt = SET;
    }
    else
    {
        Uart_Info[UART7_LTE].Rx_Cnt = 0;
    }

    Uart_Info[UART7_LTE].Rx_Timeout = 10;
}

void Uart7_Rcv_0x03_Data(unsigned char *pData)
{
    unsigned short word_buf, *pWord, *pWord2, word_cnt, byte_cnt, i, cnt, addr, cal_crc;
    unsigned char upper_addr, lower_addr, *p;
    
    addr = pData[2];
    addr <<= 8;
    addr |= pData[3];
    
    upper_addr = pData[2];
    lower_addr = pData[3];
    
    if( upper_addr == ADDR_G_LINK )		//종합반 
    {
        pWord = (unsigned short*)&EXT_61850_Info.G_LINK_STATUS[0];
        word_cnt = sizeof(EXT_61850_Info.G_LINK_STATUS) / 2;                            // 워드길이로 계산.
    }   
    else if( upper_addr == ADDR_FIRE_RECEPTION)		//수신반 
    {
        pWord = (unsigned short*)&EXT_61850_Info.FIRE_RECEPTION_STATUS[0];
        word_cnt = sizeof(EXT_61850_Info.FIRE_RECEPTION_STATUS) / 2;                            // 워드길이로 계산.
    }       
    else if( upper_addr == ADDR_FIRE_REMOTE_CONTROL)		//원격제어반 
    {
        pWord = (unsigned short*)&EXT_61850_Info.FIRE_REMOTE_CONTROL_STATUS[0];
        word_cnt = sizeof(EXT_61850_Info.FIRE_REMOTE_CONTROL_STATUS) / 2;                            // 워드길이로 계산.
    }       
    else if( upper_addr == ADDR_UNMANNED_SECURITY)		//무인경비 
    {
        pWord = (unsigned short*)&EXT_61850_Info.UNMANNED_SECURITY[0];
        word_cnt = sizeof(EXT_61850_Info.UNMANNED_SECURITY) / 2;                            // 워드길이로 계산.
    }       
    else if( upper_addr == ADDR_LTE_MEMORY || upper_addr == ADDR_LTE_MEMORY_256 || upper_addr == ADDR_LTE_MEMORY_512 )		//LTE
    {
        pWord = (unsigned short*)&Phone_Info;
		
        word_buf = (pData[2] - ADDR_LTE_MEMORY);
        word_buf <<= 8;
        word_buf |= pData[3];
        
        pWord += word_buf / 2;
        
        word_cnt = pData[5];
    }       
	
        Uart_Info[UART7_LTE].Tx_Buf[0] = pData[0];
        Uart_Info[UART7_LTE].Tx_Buf[1] = pData[1];
        
        p = &Uart_Info[UART7_LTE].Tx_Buf[3];
		
        Uart_Info[UART7_LTE].Tx_Length = 0;
        
        for(i=0;i<pData[5];i++)
        {
            //if( lower_addr >= word_cnt )    break;
            
            *p++ = (*pWord >> 8) & 0xFF;
            *p++ = *pWord & 0xFF;
            
            pWord++;
            //lower_addr++;
            Uart_Info[UART7_LTE].Tx_Length += 2;
        }
        
        Uart_Info[UART7_LTE].Tx_Buf[2] = Uart_Info[UART7_LTE].Tx_Length;
        
        Uart_Info[UART7_LTE].Tx_Length += 3;            // 헤더 3바이트
        
        cal_crc = crc16(&Uart_Info[UART7_LTE].Tx_Buf[0],Uart_Info[UART7_LTE].Tx_Length);
        
        *p++ = cal_crc >> 8;
        *p++ = cal_crc;
        
        Uart_Info[UART7_LTE].Tx_Length += 2;
        
//        HAL_UART_Transmit_IT(&huart9,Uart_Info[UART7_LTE].Tx_Buf,Uart_Info[UART7_LTE].Tx_Length);
}

void Uart7_Rcv_0x10_Data(unsigned char *pData)
{
    unsigned short word_buf, *pWord, *pWord2, word_cnt, byte_cnt, i, cnt, addr, cal_crc;
    unsigned char upper_addr, lower_addr, *p;
    
    upper_addr = pData[2];
    lower_addr = pData[3];

    if( upper_addr == ADDR_LTE_MEMORY || upper_addr == ADDR_LTE_MEMORY_256 || upper_addr == ADDR_LTE_MEMORY_512 )		//LTE
    {
        pWord = (unsigned short*)&Phone_Info;
		
        addr = upper_addr - ADDR_LTE_MEMORY;
        addr <<= 8;
        addr |= lower_addr;
        
        word_cnt = pData[5];
        
        pWord += addr / 2;
        p = pData;
        p += 7;
        
        for(i=0;i<word_cnt;i++)
        {
            word_buf = *p++;
            word_buf <<= 8;
            word_buf |= *p++;
            
            *pWord++ = word_buf;
        }
    }
}

void Uart7_Rcv_0x06_Data(unsigned char *pData)
{
    unsigned short word_buf, *pWord, *pWord2, word_cnt, byte_cnt, i, cnt, addr, cal_crc;
    unsigned char upper_addr, lower_addr, *p;
    
	upper_addr = pData[2];
	lower_addr = pData[3];
	
	word_buf = pData[4];		word_buf <<= 8;		word_buf |= pData[5];		

	Main_Info.COM_WORD_BUFF=word_buf;
	
	if( upper_addr == 0x00 )		//종합반 
	{


	}   
	else if( upper_addr == ADDR_G_LINK )		//종합반 
	{
		if(( Uart_Info[UART_GLINK].Tx_Enable == CLR ) && ( lower_addr == 0x70))
		{
			Uart_Info[UART_GLINK].Load_Addr = lower_addr;
			
			Uart_Info[UART_GLINK].Load_Buf = pData[4];
			Uart_Info[UART_GLINK].Load_Buf << 8;
			Uart_Info[UART_GLINK].Load_Buf |= pData[5];
			
			Uart_Info[UART_GLINK].Tx_Length = 6;
			Uart_Info[UART_GLINK].Tx_Enable = SET;
			Uart_Info[UART_GLINK].Tx_Repeat = 3;
		}    	
	}       
	else if( upper_addr == ADDR_FIRE_RECEPTION)		//화재 수신반 
	{
		if( lower_addr == 0x70)
		{
			if( Uart_Info[UART3_422].Tx_Enable == CLR)
			{
				Uart_Info[UART3_422].Load_Addr = pData[3];
				
				Uart_Info[UART3_422].Load_Buf = word_buf;

				Uart_Info[UART3_422].Tx_Enable = SET;
				Uart_Info[UART3_422].Tx_Repeat = 3;
			}   
			
			if(word_buf & 0x0002) EXT_61850_Info.FIRE_RECEPTION_STATUS[0] |= 0x0008;	//bit set
			else if(word_buf & 0x0001) EXT_61850_Info.FIRE_RECEPTION_STATUS[0] &= ~0x0008;	//bit clr
			
			if(word_buf & 0x0008) EXT_61850_Info.FIRE_RECEPTION_STATUS[0] |= 0x0010;	//bit set
			else if(word_buf & 0x0004) EXT_61850_Info.FIRE_RECEPTION_STATUS[0] &= ~0x0010;	//bit clr
			
			if(word_buf & 0x0020) EXT_61850_Info.FIRE_RECEPTION_STATUS[0] |= 0x0020;	//bit set
			else if(word_buf & 0x0010) EXT_61850_Info.FIRE_RECEPTION_STATUS[0] &= ~0x0020;	//bit clr
		}
	}       
	else if( upper_addr == ADDR_FIRE_REMOTE_CONTROL)		//원격 제어반 
	{
		if( lower_addr == 0x70)
		{
			if(word_buf & 0x0001)	Total_Info.RUN_STOP_STATE=1;
			else if(word_buf & 0x0002)	Total_Info.RUN_STOP_STATE=0;
		}
		else if( lower_addr == 0x71)
		{
			if(Total_Info.RUN_STOP_STATE)
				Total_Info.ON_CH = word_buf;		
		}
	}       
	else if( upper_addr == ADDR_UNMANNED_SECURITY)		//무인경비 
	{
		if( lower_addr == 0x70)
		{
			if( Uart_Info[UART4_485].Tx_Enable == CLR)
			{
/*				Uart_Info[UART4_485].Tx_Buf[0] = pData[0];
				Uart_Info[UART4_485].Tx_Buf[1] = pData[1];
				Uart_Info[UART4_485].Tx_Buf[2] = pData[2];
				Uart_Info[UART4_485].Tx_Buf[3] = pData[3];
				Uart_Info[UART4_485].Tx_Buf[4] = pData[4];
				Uart_Info[UART4_485].Tx_Buf[5] = pData[5];

				cal_crc = crc16(&Uart_Info[UART4_485].Tx_Buf[0],6);

				Uart_Info[UART4_485].Tx_Buf[6] = cal_crc >> 8;
				Uart_Info[UART4_485].Tx_Buf[7] = cal_crc;

				Uart_Info[UART4_485].Tx_Length = 8;      // 헤더 + 데이터 +  CRC
*/				
				Uart_Info[UART4_485].Tx_Enable = SET;
				Uart_Info[UART4_485].Tx_Repeat = 3;
			}			
		}
	}       
	
	Uart_Info[UART7_LTE].Tx_Buf[0] = pData[0];
	Uart_Info[UART7_LTE].Tx_Buf[1] = pData[1];
	Uart_Info[UART7_LTE].Tx_Buf[2] = pData[2];
	Uart_Info[UART7_LTE].Tx_Buf[3] = pData[3];
	Uart_Info[UART7_LTE].Tx_Buf[4] = pData[4];
	Uart_Info[UART7_LTE].Tx_Buf[5] = pData[5];

	cal_crc = crc16(&Uart_Info[UART7_LTE].Tx_Buf[0],6);

	Uart_Info[UART7_LTE].Tx_Buf[6] = cal_crc >> 8;
	Uart_Info[UART7_LTE].Tx_Buf[7] = cal_crc;

	Uart_Info[UART7_LTE].Tx_Length = 8;      // 헤더 + 데이터 +  CRC
	
//        HAL_UART_Transmit_IT(&huart9,Uart_Info[UART7_LTE].Tx_Buf,Uart_Info[UART7_LTE].Tx_Length);
}


void Uart7_Tx_Process(void)
{
    if( Uart_Info[UART7_LTE].Tx_Timeout > 1 )   return;
    
    if( Uart_Info[UART7_LTE].Tx_Timeout == 1 )
    {
        Uart_Info[UART7_LTE].Tx_Timeout = 0;
        
        Uart_Info[UART7_LTE].Tx_On = SET;
        
	 //USART7_TX;
        HAL_UART_Transmit_IT(&huart7,Uart_Info[UART7_LTE].Tx_Buf,Uart_Info[UART7_LTE].Tx_Length);
    }
}

void Uart7_Rx_Process(void)
{
    unsigned short cal_crc, rcv_crc;
    
    if( Uart_Info[UART7_LTE].Rcv_Pkt == SET )
    {
        Uart_Info[UART7_LTE].Rcv_Pkt = CLR;
    
        cal_crc = crc16((unsigned char*)Uart_Info[UART7_LTE].Rx_Buf, Uart_Info[UART7_LTE].Rx_Cnt - 2);
        rcv_crc = Uart_Info[UART7_LTE].Rx_Buf[Uart_Info[UART7_LTE].Rx_Cnt - 2];
        rcv_crc <<= 8;
        rcv_crc |= Uart_Info[UART7_LTE].Rx_Buf[Uart_Info[UART7_LTE].Rx_Cnt - 1];

        if( cal_crc == rcv_crc )                            // 패킷수신.
        {
	      	Uart_Info[UART7_LTE].Link_Time = 3000;

            if( Uart_Info[UART7_LTE].Rx_Buf[1] == 0x03 )           // 0x03 수신. 멀티리드
            {
                Uart7_Rcv_0x03_Data(&Uart_Info[UART7_LTE].Rx_Buf[0]);
            }
            else if( Uart_Info[UART7_LTE].Rx_Buf[1] == 0x10 )      // 0x10 수신. 멀티라이트
            {
                Uart7_Rcv_0x10_Data(&Uart_Info[UART7_LTE].Rx_Buf[0]);
            }
            
            else if( Uart_Info[UART7_LTE].Rx_Buf[1] == 0x06 )      // 0x06 수신. 싱글라이트
            {
                Uart7_Rcv_0x06_Data(&Uart_Info[UART7_LTE].Rx_Buf[0]);
                Uart_Info[UART7_LTE].Rx_Cnt = 0;
            }
	    else return;
            
            Uart_Info[UART7_LTE].Rx_Timeout = 0;
            Uart_Info[UART7_LTE].Tx_Timeout = 5;                   // 패킷수신 후 다음번 명령까지의 TX 딜레이는 상대측 보드의 내부 지연시간을 고려해서 50ms 후에 전송함.
        }
    }
}

