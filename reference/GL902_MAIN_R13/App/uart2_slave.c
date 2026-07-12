#include "stm32f4xx_hal.h"
#include "memory_map.h"
#include "delay.h"
#include "uart2.h"

extern UART_HandleTypeDef huart2;       // 외부기기제어. 모드버스.

void USART2_ISR(void)
{
    unsigned short rcv_length;
    unsigned char RxData;
    
    if( Uart_Info[UART2_485].Tx_On == SET )
    {
      RxData = USART2->DR;
      return;
    }
    
    if( Uart_Info[UART2_485].Rx_Timeout == 0 )   Uart_Info[UART2_485].Rx_Cnt = 0;
    if( Uart_Info[UART2_485].Rx_Cnt > 255 )   Uart_Info[UART2_485].Rx_Cnt = 0;
    
    RxData = USART2->DR;
    
    if(Uart_Info[UART2_485].Rx_Timeout == 0 && RxData == 0x01 )			// ID 검사
    {
        Uart_Info[UART2_485].Rx_Buf[Uart_Info[UART2_485].Rx_Cnt++] = RxData;
    }
    else if( Uart_Info[UART2_485].Rx_Cnt == 1 && (RxData == 0x10 || RxData == 0x03 || RxData == 0x06) )					// 쓰기, 읽기 명령
    {
        Uart_Info[UART2_485].Rx_Buf[Uart_Info[UART2_485].Rx_Cnt++] = RxData;
    }
    else if( Uart_Info[UART2_485].Rx_Cnt == 2 )					// 상위 주소
    {
        Uart_Info[UART2_485].Rx_Buf[Uart_Info[UART2_485].Rx_Cnt++] = RxData;
    }
    else if( Uart_Info[UART2_485].Rx_Cnt == 3 )					// 하위 주소
    {
        Uart_Info[UART2_485].Rx_Buf[Uart_Info[UART2_485].Rx_Cnt++] = RxData;
    }
    else if( Uart_Info[UART2_485].Rx_Cnt == 4 )					// 데이터 길이
    {
        Uart_Info[UART2_485].Rx_Buf[Uart_Info[UART2_485].Rx_Cnt++] = RxData;
    }
    else if( Uart_Info[UART2_485].Rx_Cnt == 5 )					// 데이터 길이
    {
        Uart_Info[UART2_485].Rx_Buf[Uart_Info[UART2_485].Rx_Cnt++] = RxData;
    }
    else if( Uart_Info[UART2_485].Rx_Cnt >= 6 && Uart_Info[UART2_485].Rx_Buf[1] == 0x03 )	// 읽기
    {
        Uart_Info[UART2_485].Rx_Buf[Uart_Info[UART2_485].Rx_Cnt++] = RxData;

        if( Uart_Info[UART2_485].Rx_Cnt == 8 )
            Uart_Info[UART2_485].Rcv_Pkt = SET;
    }
    else if( Uart_Info[UART2_485].Rx_Cnt >= 6 && Uart_Info[UART2_485].Rx_Buf[1] == 0x06 )	// 쓰기
    {
        Uart_Info[UART2_485].Rx_Buf[Uart_Info[UART2_485].Rx_Cnt++] = RxData;

        if( Uart_Info[UART2_485].Rx_Cnt == 8 )
        {
            Uart_Info[UART2_485].Rcv_Pkt = SET;
        }
    }
    else if( Uart_Info[UART2_485].Rx_Cnt >= 6 && Uart_Info[UART2_485].Rx_Buf[1] == 0x10 )	// 쓰기
    {
        rcv_length = Uart_Info[UART2_485].Rx_Buf[6];

        Uart_Info[UART2_485].Rx_Buf[Uart_Info[UART2_485].Rx_Cnt++] = RxData;

        if( Uart_Info[UART2_485].Rx_Cnt == (7 + rcv_length + 2) )		// 헤더 + 데이터 + CRC
            Uart_Info[UART2_485].Rcv_Pkt = SET;
    }
    else
    {
        Uart_Info[UART2_485].Rx_Cnt = 0;
    }

    Uart_Info[UART2_485].Rx_Timeout = 10;
}

void Uart2_Rcv_0x03_Data(unsigned char *pData)
{
    unsigned short word_buf, *pWord, *pWord2, word_cnt, byte_cnt, i, cnt, addr, cal_crc;
    unsigned char upper_addr, lower_addr, *p;
    
    addr = pData[2];
    addr <<= 8;
    addr |= pData[3];
    
    upper_addr = pData[2];
    lower_addr = pData[3]/2;
    
    if( upper_addr == MEM_ADDR_TOTAL )
    {
        pWord = (unsigned short*)&Total_Info;
        word_cnt = sizeof(Total_Info) / 2;                            // 워드길이로 계산.
        
        Uart_Info[UART2_485].Tx_Buf[0] = pData[0];
        Uart_Info[UART2_485].Tx_Buf[1] = pData[1];
        
        p = &Uart_Info[UART2_485].Tx_Buf[3];
        Uart_Info[UART2_485].Tx_Length = 0;
        
        for(i=0;i<pData[5];i++)
        {
            if( lower_addr >= word_cnt )    break;
            
            *p++ = (pWord[lower_addr] >> 8) & 0xFF;
            *p++ = pWord[lower_addr] & 0xFF;
            
            lower_addr++;
            Uart_Info[UART2_485].Tx_Length += 2;
        }
        
        Uart_Info[UART2_485].Tx_Buf[2] = Uart_Info[UART2_485].Tx_Length;
        
        Uart_Info[UART2_485].Tx_Length += 3;            // 헤더 3바이트
        
        cal_crc = crc16(&Uart_Info[UART2_485].Tx_Buf[0],Uart_Info[UART2_485].Tx_Length);
        
        *p++ = cal_crc >> 8;
        *p++ = cal_crc;
        
        Uart_Info[UART2_485].Tx_Length += 2;
        
//        HAL_UART_Transmit_IT(&huart2,Uart_Info[1].Tx_Buf,Uart_Info[1].Tx_Length);
    }
    else if( upper_addr >= MEM_ADDR_COMP1 && upper_addr <= MEM_ADDR_COMP8 )
    {
        pWord = (unsigned short*)&Comp_Info[upper_addr - 0x11];
        word_cnt = sizeof(Comp_Info[upper_addr - 0x11]) / 2;                            // 워드길이로 계산.
        
        Uart_Info[UART2_485].Tx_Buf[0] = pData[0];
        Uart_Info[UART2_485].Tx_Buf[1] = pData[1];
        
        p = &Uart_Info[UART2_485].Tx_Buf[3];
        Uart_Info[UART2_485].Tx_Length = 0;
        
        for(i=0;i<pData[5];i++)
        {
            if( lower_addr >= word_cnt )    break;
            
            *p++ = (pWord[lower_addr] >> 8) & 0xFF;
            *p++ = pWord[lower_addr] & 0xFF;
            
            lower_addr++;
            Uart_Info[UART2_485].Tx_Length += 2;
        }
        
        Uart_Info[UART2_485].Tx_Buf[2] = Uart_Info[UART2_485].Tx_Length;
        
        Uart_Info[UART2_485].Tx_Length += 3;            // 헤더 3바이트
        
        cal_crc = crc16(&Uart_Info[UART2_485].Tx_Buf[0],Uart_Info[UART2_485].Tx_Length);
        
        *p++ = cal_crc >> 8;
        *p++ = cal_crc;
        
        Uart_Info[UART2_485].Tx_Length += 2;
        
//        HAL_UART_Transmit_IT(&huart2,Uart_Info[1].Tx_Buf,Uart_Info[1].Tx_Length);
    }
    else if( upper_addr >= MEM_ADDR_IO_0xE0 && upper_addr <= MEM_ADDR_IO_0xEF )
    {
        pWord = (unsigned short*)&IO_Info[upper_addr - 0xE0];
        word_cnt = sizeof(IO_Info[upper_addr - 0xE0]) / 2;                            // 워드길이로 계산.
        
        Uart_Info[UART2_485].Tx_Buf[0] = pData[0];
        Uart_Info[UART2_485].Tx_Buf[1] = pData[1];
        
        p = &Uart_Info[UART2_485].Tx_Buf[3];
        Uart_Info[UART2_485].Tx_Length = 0;
        
        for(i=0;i<pData[5];i++)
        {
            if( lower_addr >= word_cnt )    break;
            
            *p++ = (pWord[lower_addr] >> 8) & 0xFF;
            *p++ = pWord[lower_addr] & 0xFF;
            
            lower_addr++;
            Uart_Info[UART2_485].Tx_Length += 2;
        }
        
        Uart_Info[UART2_485].Tx_Buf[2] = Uart_Info[1].Tx_Length;
        
        Uart_Info[UART2_485].Tx_Length += 3;            // 헤더 3바이트
        
        cal_crc = crc16(&Uart_Info[UART2_485].Tx_Buf[0],Uart_Info[UART2_485].Tx_Length);
        
        *p++ = cal_crc >> 8;
        *p++ = cal_crc;
        
        Uart_Info[UART2_485].Tx_Length += 2;
        
//        HAL_UART_Transmit_IT(&huart2,Uart_Info[1].Tx_Buf,Uart_Info[1].Tx_Length);
    }
    else if( upper_addr >= MEM_ADDR_20mA_0xF0 && upper_addr <= MEM_ADDR_20mA_0xFF )
    {
        pWord = (unsigned short*)&AI_Info[upper_addr - 0xF0];
        word_cnt = sizeof(AI_Info[upper_addr - 0xF0]) / 2;                            // 워드길이로 계산.
        
        Uart_Info[UART2_485].Tx_Buf[0] = pData[0];
        Uart_Info[UART2_485].Tx_Buf[1] = pData[1];
        
        p = &Uart_Info[UART2_485].Tx_Buf[3];
        Uart_Info[UART2_485].Tx_Length = 0;
        
        for(i=0;i<pData[5];i++)
        {
            if( lower_addr >= word_cnt )    break;
            
            *p++ = (pWord[lower_addr] >> 8) & 0xFF;
            *p++ = pWord[lower_addr] & 0xFF;
            
            lower_addr++;
            Uart_Info[UART2_485].Tx_Length += 2;
        }
        
        Uart_Info[UART2_485].Tx_Buf[2] = Uart_Info[UART2_485].Tx_Length;
        
        Uart_Info[UART2_485].Tx_Length += 3;            // 헤더 3바이트
        
        cal_crc = crc16(&Uart_Info[UART2_485].Tx_Buf[0],Uart_Info[UART2_485].Tx_Length);
        
        *p++ = cal_crc >> 8;
        *p++ = cal_crc;
        
        Uart_Info[UART2_485].Tx_Length += 2;
        
//        HAL_UART_Transmit_IT(&huart2,Uart_Info[UART2_485].Tx_Buf,Uart_Info[UART2_485].Tx_Length);
    	}
}

void Uart2_Rcv_0x10_Data(unsigned char *pData)
{
    unsigned short word_buf, *pWord, *pWord2, word_cnt, byte_cnt, i, cnt, addr, cal_crc, size;
    unsigned char upper_addr, lower_addr, *p, set_time = 0;
    
    upper_addr = pData[2];
    lower_addr = pData[3];
	
    if( upper_addr == MEM_ADDR_TOTAL )
    {
        word_cnt = pData[4];
        word_cnt <<= 8;
        word_cnt |= pData[5];

        pWord = (unsigned short*)&Total_Info;
        size = sizeof(Total_Info);

        pWord += lower_addr / 2;

        cnt = 7;

        for(i=0;i<word_cnt;i++)
        {
            if( size <= lower_addr )     break;

            word_buf = pData[cnt++];
            word_buf <<= 8;
            word_buf |= pData[cnt++];
			
	     if( lower_addr >= ((unsigned char*)&Total_Info.Year_Week - (unsigned char*)&Total_Info) )    set_time = 1;   // 시간
	     
	     else if( lower_addr < ((unsigned char*)&Total_Info.SYSTEM_CONT - (unsigned char*)&Total_Info) )
            		Write_Fram(TOTAL_DATA_ADDRESS + lower_addr,(unsigned char*)&word_buf,2);
            
            *pWord++ = word_buf;

            lower_addr += 2;
        }
		
	if( set_time )      
		Set_Time();	
    }
    else if( upper_addr >= MEM_ADDR_COMP1 && upper_addr <= MEM_ADDR_COMP8 )
    {
        Uart_Info[UART2_485].Tx_Buf[0] = upper_addr - 0x10;
        Uart_Info[UART2_485].Tx_Buf[1] = 0x20;
        Uart_Info[UART2_485].Tx_Buf[2] = pData[2];
        Uart_Info[UART2_485].Tx_Buf[3] = pData[3];
        Uart_Info[UART2_485].Tx_Buf[4] = 0;
        Uart_Info[UART2_485].Tx_Buf[5] = pData[5] * 2;      // word -> byte;
        
        p = &Uart_Info[UART2_485].Tx_Buf[6];
        
        for(i=0;i<pData[6];i++)
            *p++ = pData[7 + i];
        
        cal_crc = crc16(&Uart_Info[UART2_485].Tx_Buf[0],6 + pData[6]);
        
        *p++ = cal_crc >> 8;
        *p++ = cal_crc;
        
        Uart_Info[UART2_485].Tx_Length = 6 + pData[6] + 2;      // 헤더 + 데이터 +  CRC
        Uart_Info[UART2_485].Tx_Enable = SET;
        Uart_Info[UART2_485].Tx_Repeat = 3;
    }
    else if( upper_addr >= MEM_ADDR_IO_0xE0 && upper_addr <= MEM_ADDR_IO_0xEF )
    {
        Uart_Info[UART2_485].Tx_Buf[0] = upper_addr;
        Uart_Info[UART2_485].Tx_Buf[1] = 0x20;
        Uart_Info[UART2_485].Tx_Buf[2] = pData[2];
        Uart_Info[UART2_485].Tx_Buf[3] = pData[3];
        Uart_Info[UART2_485].Tx_Buf[4] = 0;
        Uart_Info[UART2_485].Tx_Buf[5] = pData[5] * 2;      // word -> byte;
        
        p = &Uart_Info[UART2_485].Tx_Buf[6];
        
        for(i=0;i<pData[6];i++)
            *p++ = pData[7 + i];
        
        cal_crc = crc16(&Uart_Info[UART2_485].Tx_Buf[0],6 + pData[6]);
        
        *p++ = cal_crc >> 8;
        *p++ = cal_crc;
        
        Uart_Info[UART2_485].Tx_Length = 6 + pData[6] + 2;      // 헤더 + 데이터 +  CRC
        Uart_Info[UART2_485].Tx_Enable = SET;
        Uart_Info[UART2_485].Tx_Repeat = 3;
    }
    else if( upper_addr >= MEM_ADDR_20mA_0xF0 && upper_addr <= MEM_ADDR_20mA_0xFF )
    {
        Uart_Info[UART2_485].Tx_Buf[0] = upper_addr;
        Uart_Info[UART2_485].Tx_Buf[1] = 0x20;
        Uart_Info[UART2_485].Tx_Buf[2] = pData[2];
        Uart_Info[UART2_485].Tx_Buf[3] = pData[3];
        Uart_Info[UART2_485].Tx_Buf[4] = 0;
        Uart_Info[UART2_485].Tx_Buf[5] = pData[5] * 2;      // word -> byte;
        
        p = &Uart_Info[UART2_485].Tx_Buf[6];
        
        for(i=0;i<pData[6];i++)
            *p++ = pData[7 + i];
        
        cal_crc = crc16(&Uart_Info[UART2_485].Tx_Buf[0],6 + pData[6]);
        
        *p++ = cal_crc >> 8;
        *p++ = cal_crc;
        
        Uart_Info[UART2_485].Tx_Length = 6 + pData[6] + 2;      // 헤더 + 데이터 +  CRC
        Uart_Info[UART2_485].Tx_Enable = SET;
        Uart_Info[UART2_485].Tx_Repeat = 3;
    }
}

void Uart2_Rcv_0x06_Data(unsigned char *pData)
{
    unsigned short word_buf, *pWord, *pWord2, word_cnt, byte_cnt, i, cnt, addr, cal_crc;
    unsigned char upper_addr, lower_addr, *p;
    
    upper_addr = pData[2];
    lower_addr = pData[3];
    
    if( upper_addr >= MEM_ADDR_COMP1 && upper_addr <= MEM_ADDR_COMP8 )
    {
        Uart_Info[UART2_485].Tx_Buf[0] = upper_addr - 0x10;
        Uart_Info[UART2_485].Tx_Buf[1] = 0x20;
        Uart_Info[UART2_485].Tx_Buf[2] = pData[2];
        Uart_Info[UART2_485].Tx_Buf[3] = pData[3];
        Uart_Info[UART2_485].Tx_Buf[4] = 0;
        Uart_Info[UART2_485].Tx_Buf[5] = 2;      // 2byte 고정;
        Uart_Info[UART2_485].Tx_Buf[6] = pData[4];
        Uart_Info[UART2_485].Tx_Buf[7] = pData[5];
        
        cal_crc = crc16(&Uart_Info[UART2_485].Tx_Buf[0],8);
        
        Uart_Info[UART2_485].Tx_Buf[8] = cal_crc >> 8;
        Uart_Info[UART2_485].Tx_Buf[9] = cal_crc;
        
        Uart_Info[UART2_485].Tx_Length = 10;      // 헤더 + 데이터 +  CRC
        Uart_Info[UART2_485].Tx_Enable = SET;
        Uart_Info[UART2_485].Tx_Repeat = 3;
    }
    else if( upper_addr >= MEM_ADDR_IO_0xE0 && upper_addr <= MEM_ADDR_IO_0xEF )
    {
        Uart_Info[UART2_485].Tx_Buf[0] = upper_addr;
        Uart_Info[UART2_485].Tx_Buf[1] = 0x20;
        Uart_Info[UART2_485].Tx_Buf[2] = pData[2];
        Uart_Info[UART2_485].Tx_Buf[3] = pData[3];
        Uart_Info[UART2_485].Tx_Buf[4] = 0;
        Uart_Info[UART2_485].Tx_Buf[5] = 2;      // 2byte 고정;
        Uart_Info[UART2_485].Tx_Buf[6] = pData[4];
        Uart_Info[UART2_485].Tx_Buf[7] = pData[5];
        
        cal_crc = crc16(&Uart_Info[UART2_485].Tx_Buf[0],8);
        
        Uart_Info[UART2_485].Tx_Buf[8] = cal_crc >> 8;
        Uart_Info[UART2_485].Tx_Buf[9] = cal_crc;
        
        Uart_Info[UART2_485].Tx_Length = 10;      // 헤더 + 데이터 +  CRC
        Uart_Info[UART2_485].Tx_Enable = SET;
        Uart_Info[UART2_485].Tx_Repeat = 3;
    }
    else if( upper_addr >= MEM_ADDR_20mA_0xF0 && upper_addr <= MEM_ADDR_20mA_0xFF )
    {
        Uart_Info[UART2_485].Tx_Buf[0] = upper_addr;
        Uart_Info[UART2_485].Tx_Buf[1] = 0x20;
        Uart_Info[UART2_485].Tx_Buf[2] = pData[2];
        Uart_Info[UART2_485].Tx_Buf[3] = pData[3];
        Uart_Info[UART2_485].Tx_Buf[4] = 0;
        Uart_Info[UART2_485].Tx_Buf[5] = 2;      // 2byte 고정;
        Uart_Info[UART2_485].Tx_Buf[6] = pData[4];
        Uart_Info[UART2_485].Tx_Buf[7] = pData[5];
        
        cal_crc = crc16(&Uart_Info[UART2_485].Tx_Buf[0],8);
        
        Uart_Info[UART2_485].Tx_Buf[8] = cal_crc >> 8;
        Uart_Info[UART2_485].Tx_Buf[9] = cal_crc;
        
        Uart_Info[UART2_485].Tx_Length = 10;      // 헤더 + 데이터 +  CRC
        Uart_Info[UART2_485].Tx_Enable = SET;
        Uart_Info[UART2_485].Tx_Repeat = 3;
    }
}

void Uart2_Tx_Process(void)
{
    unsigned short word_buf, *pWord, *pWord2, word_cnt, byte_cnt, i, cnt, addr, cal_crc;
    unsigned char upper_addr, lower_addr, *p;

    if( Uart_Info[UART2_485].Tx_Timeout > 1 )   return;
    
    	if( Uart_Info[UART2_485].Tx_Timeout == 1 )
    	{
        	Uart_Info[UART2_485].Tx_Timeout = 0;
		
		if( Uart_Info[UART2_485].Rx_Buf[1] == 0x03 )           // 0x03 수신. 멀티리드
		{
		    Uart2_Rcv_0x03_Data(&Uart_Info[1].Rx_Buf[0]);
		}
		else if(( Uart_Info[UART2_485].Rx_Buf[1] == 0x10 ) ||( Uart_Info[UART2_485].Rx_Buf[1] == 0x06 ))     // 0x10 수신. 멀티라이트
		{
			Uart_Info[UART2_485].Tx_Buf[0] = Uart_Info[UART2_485].Rx_Buf[0];
        		Uart_Info[UART2_485].Tx_Buf[1] = Uart_Info[UART2_485].Rx_Buf[1];
			Uart_Info[UART2_485].Tx_Buf[2] = Uart_Info[UART2_485].Rx_Buf[2];
        		Uart_Info[UART2_485].Tx_Buf[3] = Uart_Info[UART2_485].Rx_Buf[3];
			Uart_Info[UART2_485].Tx_Buf[4] = Uart_Info[UART2_485].Rx_Buf[4];
        		Uart_Info[UART2_485].Tx_Buf[5] = Uart_Info[UART2_485].Rx_Buf[5];
				
			Uart_Info[UART2_485].Tx_Length = 6;            // 헤더 3바이트

			cal_crc = crc16(&Uart_Info[UART2_485].Tx_Buf[0],Uart_Info[UART2_485].Tx_Length);

			Uart_Info[UART2_485].Tx_Buf[6] = cal_crc >> 8;
			Uart_Info[UART2_485].Tx_Buf[7] = cal_crc;

			Uart_Info[UART2_485].Tx_Length += 2;
			
		}
		
        	HAL_UART_Transmit_IT(&huart2,Uart_Info[UART2_485].Tx_Buf,Uart_Info[UART2_485].Tx_Length);
    	}
}
void Uart2_Rx_Process(void)
{
    unsigned short cal_crc, rcv_crc;
    
    if( Uart_Info[UART2_485].Rcv_Pkt == SET )
    {
        Uart_Info[UART2_485].Rcv_Pkt = CLR;
    
        cal_crc = crc16((unsigned char*)Uart_Info[UART2_485].Rx_Buf, Uart_Info[UART2_485].Rx_Cnt - 2);
        rcv_crc = Uart_Info[UART2_485].Rx_Buf[Uart_Info[UART2_485].Rx_Cnt - 2];
        rcv_crc <<= 8;
        rcv_crc |= Uart_Info[UART2_485].Rx_Buf[Uart_Info[UART2_485].Rx_Cnt - 1];

        if( cal_crc == rcv_crc )                            // 패킷수신.
        {
	      	Uart_Info[UART2_485].Link_Time = 3000;

            if( Uart_Info[UART2_485].Rx_Buf[1] == 0x03 )           // 0x03 수신. 멀티리드
            {
                Uart2_Rcv_0x03_Data(&Uart_Info[UART2_485].Rx_Buf[0]);
            }
            else if( Uart_Info[UART2_485].Rx_Buf[1] == 0x10 )      // 0x10 수신. 멀티라이트
            {
                Uart2_Rcv_0x10_Data(&Uart_Info[UART2_485].Rx_Buf[0]);
            }
            else if( Uart_Info[UART2_485].Rx_Buf[1] == 0x06 )      // 0x06 수신. 싱글라이트
            {
                Uart2_Rcv_0x06_Data(&Uart_Info[UART2_485].Rx_Buf[0]);
                Uart_Info[UART2_485].Rx_Cnt = 0;
            }
	    else 
		return;
            
            Uart_Info[UART2_485].Rx_Timeout = 0;
            Uart_Info[UART2_485].Tx_Timeout = 5;                   // 패킷수신 후 다음번 명령까지의 TX 딜레이는 상대측 보드의 내부 지연시간을 고려해서 50ms 후에 전송함.
        }
    }
}
