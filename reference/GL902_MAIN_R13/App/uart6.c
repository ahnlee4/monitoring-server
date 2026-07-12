#include "stm32f4xx_hal.h"
#include "memory_map.h"
#include "delay.h"
#include "uart6.h"

extern UART_HandleTypeDef huart6;

void USART6_ISR(void)
{
    unsigned short rcv_length;
    unsigned char RxData;
    
    if( Uart_Info[UART6_TEST].Rx_Timeout == 0 )   Uart_Info[UART6_TEST].Rx_Cnt = 0;
    if( Uart_Info[UART6_TEST].Rx_Cnt > 275 )   Uart_Info[UART6_TEST].Rx_Cnt = 0;
    
    RxData = USART6->DR;	
    
    if( Uart_Info[UART6_TEST].Rx_Cnt == 0  && RxData == 0xC9 )			// ID 검사
    {
        Uart_Info[UART6_TEST].Rx_Buf[Uart_Info[UART6_TEST].Rx_Cnt++] = RxData;
    }
    else if( Uart_Info[UART6_TEST].Rx_Cnt == 1 && (RxData == 0x20 || RxData == 0x13 || RxData == 0x15) )					// 쓰기, 읽기 명령
    {
        Uart_Info[UART6_TEST].Rx_Buf[Uart_Info[UART6_TEST].Rx_Cnt++] = RxData;
    }
    else if( Uart_Info[UART6_TEST].Rx_Buf[1] == 0x13 )
    {
        if( Uart_Info[UART6_TEST].Rx_Buf[0] == 0xC9 )
        {
            if( Uart_Info[UART6_TEST].Rx_Cnt == 2 )					// 상위 주소
            {
                Uart_Info[UART6_TEST].Rx_Buf[Uart_Info[UART6_TEST].Rx_Cnt++] = RxData;
            }
            else if( Uart_Info[UART6_TEST].Rx_Cnt == 3 )					// 하위 주소
            {
                Uart_Info[UART6_TEST].Rx_Buf[Uart_Info[UART6_TEST].Rx_Cnt++] = RxData;
            }
            else if( Uart_Info[UART6_TEST].Rx_Cnt == 4 )					// 데이터 길이
            {
                Uart_Info[UART6_TEST].Rx_Buf[Uart_Info[UART6_TEST].Rx_Cnt++] = RxData;
            }
            else if( Uart_Info[UART6_TEST].Rx_Cnt == 5 )					// 데이터 길이
            {
                Uart_Info[UART6_TEST].Rx_Buf[Uart_Info[UART6_TEST].Rx_Cnt++] = RxData;
            }
            else if( Uart_Info[UART6_TEST].Rx_Cnt >= 6 )	// 읽기
            {
                Uart_Info[UART6_TEST].Rx_Buf[Uart_Info[UART6_TEST].Rx_Cnt++] = RxData;

                if( Uart_Info[UART6_TEST].Rx_Cnt == 8 )
                    Uart_Info[UART6_TEST].Rcv_Pkt = SET;
            }
            else
            {
                Uart_Info[UART6_TEST].Rx_Cnt = 0;
            }
        }
        else
        {
            if( Uart_Info[UART6_TEST].Rx_Cnt == 2 )					// 상위 주소
            {
                Uart_Info[UART6_TEST].Rx_Buf[Uart_Info[UART6_TEST].Rx_Cnt++] = RxData;
            }
            else if( Uart_Info[UART6_TEST].Rx_Cnt == 3 )					// 하위 주소
            {
                Uart_Info[UART6_TEST].Rx_Buf[Uart_Info[UART6_TEST].Rx_Cnt++] = RxData;
            }
            else if( Uart_Info[UART6_TEST].Rx_Cnt == 4 )					// CRC
            {
                Uart_Info[UART6_TEST].Rx_Buf[Uart_Info[UART6_TEST].Rx_Cnt++] = RxData;
            }
            else if( Uart_Info[UART6_TEST].Rx_Cnt == 5 )					// CRC
            {
                Uart_Info[UART6_TEST].Rx_Buf[Uart_Info[UART6_TEST].Rx_Cnt++] = RxData;
                
                if( Uart_Info[UART6_TEST].Rx_Cnt == 6 )
                    Uart_Info[UART6_TEST].Rcv_Pkt = SET;
            }
            else
            {
                Uart_Info[UART6_TEST].Rx_Cnt = 0;
            }
        }
    }
    else if( Uart_Info[UART6_TEST].Rx_Buf[1] == 0x15 )
    {
        if( Uart_Info[UART6_TEST].Rx_Cnt == 2 )					// 상위 주소
        {
            Uart_Info[UART6_TEST].Rx_Buf[Uart_Info[UART6_TEST].Rx_Cnt++] = RxData;
        }
        else if( Uart_Info[UART6_TEST].Rx_Cnt == 3 )					// 하위 주소
        {
            Uart_Info[UART6_TEST].Rx_Buf[Uart_Info[UART6_TEST].Rx_Cnt++] = RxData;
        }
        else if( Uart_Info[UART6_TEST].Rx_Cnt == 4 )					// 데이터 길이
        {
            Uart_Info[UART6_TEST].Rx_Buf[Uart_Info[UART6_TEST].Rx_Cnt++] = RxData;
        }
        else if( Uart_Info[UART6_TEST].Rx_Cnt == 5 )					// 데이터 길이
        {
            Uart_Info[UART6_TEST].Rx_Buf[Uart_Info[UART6_TEST].Rx_Cnt++] = RxData;
        }
        else if( Uart_Info[UART6_TEST].Rx_Cnt >= 6 )	// 읽기
        {
            Uart_Info[UART6_TEST].Rx_Buf[Uart_Info[UART6_TEST].Rx_Cnt++] = RxData;

            if( Uart_Info[UART6_TEST].Rx_Cnt == 8 )
                Uart_Info[UART6_TEST].Rcv_Pkt = SET;
        }
        else
        {
            Uart_Info[UART6_TEST].Rx_Cnt = 0;
        }
    }
    else if( Uart_Info[UART6_TEST].Rx_Buf[1] == 0x20 )
    {
        if( Uart_Info[UART6_TEST].Rx_Cnt == 2 )					// 상위 주소
        {
            Uart_Info[UART6_TEST].Rx_Buf[Uart_Info[UART6_TEST].Rx_Cnt++] = RxData;
        }
        else if( Uart_Info[UART6_TEST].Rx_Cnt == 3 )					// 하위 주소
        {
            Uart_Info[UART6_TEST].Rx_Buf[Uart_Info[UART6_TEST].Rx_Cnt++] = RxData;
        }
        else if( Uart_Info[UART6_TEST].Rx_Cnt == 4 )					// 데이터 길이
        {
            Uart_Info[UART6_TEST].Rx_Buf[Uart_Info[UART6_TEST].Rx_Cnt++] = RxData;
        }
        else if( Uart_Info[UART6_TEST].Rx_Cnt == 5 )					// 데이터 길이
        {
            Uart_Info[UART6_TEST].Rx_Buf[Uart_Info[UART6_TEST].Rx_Cnt++] = RxData;
        }
        else if( Uart_Info[UART6_TEST].Rx_Cnt >= 6 )	                // 데이터
        {
            rcv_length = (Uart_Info[UART6_TEST].Rx_Buf[4] << 8 | Uart_Info[UART6_TEST].Rx_Buf[5]);

            Uart_Info[UART6_TEST].Rx_Buf[Uart_Info[UART6_TEST].Rx_Cnt++] = RxData;

            if( Uart_Info[UART6_TEST].Rx_Cnt == (6 + rcv_length + 2) )		// 헤더 + 데이터 + CRC
                Uart_Info[UART6_TEST].Rcv_Pkt = SET;
        }
        else
        {
            Uart_Info[UART6_TEST].Rx_Cnt = 0;
        }
    }
    else
        Uart_Info[UART6_TEST].Rx_Cnt = 0;

    Uart_Info[UART6_TEST].Rx_Timeout = 5;
}


void Uart6_Rcv_0x13_Data(unsigned char *pData)
{
    unsigned short word_buf, *pWord, *pWord2, word_cnt, byte_cnt, i, cnt, addr, cal_crc;
    unsigned char upper_addr, lower_addr, *p;
    
    addr = pData[2];
    addr <<= 8;
    addr |= pData[3];
    
    upper_addr = pData[2];
    lower_addr = pData[3];
    
    if( upper_addr == MEM_ADDR_TOTAL )
    {
        pWord = (unsigned short*)&Total_Info;
        pWord2 = (unsigned short*)&Total_Info_3;
        
        word_cnt = sizeof(Total_Info);
        
        Uart_Info[UART6_TEST].Tx_Buf[0] = 0x65;
        Uart_Info[UART6_TEST].Tx_Buf[1] = 0x13;
        Uart_Info[UART6_TEST].Tx_Buf[2] = pData[2];
        Uart_Info[UART6_TEST].Tx_Buf[3] = pData[3];
        Uart_Info[UART6_TEST].Tx_Buf[4] = word_cnt >> 8;
        Uart_Info[UART6_TEST].Tx_Buf[5] = word_cnt & 0xFF;
        
        p = &Uart_Info[UART6_TEST].Tx_Buf[6];
        
        for(i=0;i<word_cnt;i+=2)
        {
            *p++ = (*pWord >> 8) & 0xFF;
            *p++ = *pWord & 0xFF;
            
            *pWord2 = *pWord;
            
            pWord++;
            pWord2++;
        }
        
        cal_crc = crc16(&Uart_Info[UART6_TEST].Tx_Buf[0],6 + word_cnt);
        
        *p++ = cal_crc >> 8;
        *p++ = cal_crc;
        
        Uart_Info[UART6_TEST].Tx_Length = 6 + word_cnt + 2;
        
//        USART1_TX;
//        HAL_UART_Transmit_IT(&huart1,Uart_Info[UART6_TEST].Tx_Buf,Uart_Info[UART6_TEST].Tx_Length);
    }
    else if( upper_addr == MEM_ADDR_SYSTEM )
    {

    }
    else if( upper_addr == MEM_ADDR_COMP1)
    {
        pWord = (unsigned short*)&EXT_61850_Info.G_LINK_STATUS[0];
        pWord2 = (unsigned short*)&EXT_61850_Info_3.G_LINK_STATUS[0];
        
        word_cnt = sizeof(EXT_61850_Info.G_LINK_STATUS);

        
        Uart_Info[UART6_TEST].Tx_Buf[0] = 0x65;
        Uart_Info[UART6_TEST].Tx_Buf[1] = 0x13;
        Uart_Info[UART6_TEST].Tx_Buf[2] = pData[2];
        Uart_Info[UART6_TEST].Tx_Buf[3] = pData[3];
        Uart_Info[UART6_TEST].Tx_Buf[4] = word_cnt >> 8;
        Uart_Info[UART6_TEST].Tx_Buf[5] = word_cnt & 0xFF;
        
        p = &Uart_Info[UART6_TEST].Tx_Buf[6];
        
        for(i=0;i<word_cnt;i+=2)
        {
            *p++ = (*pWord >> 8) & 0xFF;
            *p++ = *pWord & 0xFF;
            
            *pWord2 = *pWord;
            
            pWord++;
            pWord2++;
        }
        
        cal_crc = crc16(&Uart_Info[UART6_TEST].Tx_Buf[0],6 + word_cnt);
        
        *p++ = cal_crc >> 8;
        *p++ = cal_crc;
        
        Uart_Info[UART6_TEST].Tx_Length = 6 + word_cnt + 2;
        
//        USART1_TX;
//        HAL_UART_Transmit_IT(&huart1,Uart_Info[UART6_TEST].Tx_Buf,Uart_Info[UART6_TEST].Tx_Length);
    }
    else if( upper_addr == MEM_ADDR_COMP2)
    {
        pWord = (unsigned short*)&EXT_61850_Info.FIRE_RECEPTION_STATUS[0];
        pWord2 = (unsigned short*)&EXT_61850_Info_3.FIRE_RECEPTION_STATUS[0];
        
        word_cnt = sizeof(EXT_61850_Info.FIRE_RECEPTION_STATUS);

        
        Uart_Info[UART6_TEST].Tx_Buf[0] = 0x65;
        Uart_Info[UART6_TEST].Tx_Buf[1] = 0x13;
        Uart_Info[UART6_TEST].Tx_Buf[2] = pData[2];
        Uart_Info[UART6_TEST].Tx_Buf[3] = pData[3];
        Uart_Info[UART6_TEST].Tx_Buf[4] = word_cnt >> 8;
        Uart_Info[UART6_TEST].Tx_Buf[5] = word_cnt & 0xFF;
        
        p = &Uart_Info[UART6_TEST].Tx_Buf[6];
        
        for(i=0;i<word_cnt;i+=2)
        {
            *p++ = (*pWord >> 8) & 0xFF;
            *p++ = *pWord & 0xFF;
            
            *pWord2 = *pWord;
            
            pWord++;
            pWord2++;
        }
        
        cal_crc = crc16(&Uart_Info[UART6_TEST].Tx_Buf[0],6 + word_cnt);
        
        *p++ = cal_crc >> 8;
        *p++ = cal_crc;
        
        Uart_Info[UART6_TEST].Tx_Length = 6 + word_cnt + 2;
        
//        USART1_TX;
//        HAL_UART_Transmit_IT(&huart1,Uart_Info[UART6_TEST].Tx_Buf,Uart_Info[UART6_TEST].Tx_Length);
    }
    else if( upper_addr == MEM_ADDR_COMP3)
    {
        pWord = (unsigned short*)&EXT_61850_Info.FIRE_REMOTE_CONTROL_STATUS[0];
        pWord2 = (unsigned short*)&EXT_61850_Info_3.FIRE_REMOTE_CONTROL_STATUS[0];
        
        word_cnt = sizeof(EXT_61850_Info.FIRE_REMOTE_CONTROL_STATUS);

        
        Uart_Info[UART6_TEST].Tx_Buf[0] = 0x65;
        Uart_Info[UART6_TEST].Tx_Buf[1] = 0x13;
        Uart_Info[UART6_TEST].Tx_Buf[2] = pData[2];
        Uart_Info[UART6_TEST].Tx_Buf[3] = pData[3];
        Uart_Info[UART6_TEST].Tx_Buf[4] = word_cnt >> 8;
        Uart_Info[UART6_TEST].Tx_Buf[5] = word_cnt & 0xFF;
        
        p = &Uart_Info[UART6_TEST].Tx_Buf[6];
        
        for(i=0;i<word_cnt;i+=2)
        {
            *p++ = (*pWord >> 8) & 0xFF;
            *p++ = *pWord & 0xFF;
            
            *pWord2 = *pWord;
            
            pWord++;
            pWord2++;
        }
        
        cal_crc = crc16(&Uart_Info[UART6_TEST].Tx_Buf[0],6 + word_cnt);
        
        *p++ = cal_crc >> 8;
        *p++ = cal_crc;
        
        Uart_Info[UART6_TEST].Tx_Length = 6 + word_cnt + 2;
        
//        USART1_TX;
//        HAL_UART_Transmit_IT(&huart1,Uart_Info[UART6_TEST].Tx_Buf,Uart_Info[UART6_TEST].Tx_Length);
    }
    else if( upper_addr == MEM_ADDR_COMP4)
    {
        pWord = (unsigned short*)&EXT_61850_Info.UNMANNED_SECURITY[0];
        pWord2 = (unsigned short*)&EXT_61850_Info_3.UNMANNED_SECURITY[0];
        
        word_cnt = sizeof(EXT_61850_Info.UNMANNED_SECURITY);

        
        Uart_Info[UART6_TEST].Tx_Buf[0] = 0x65;
        Uart_Info[UART6_TEST].Tx_Buf[1] = 0x13;
        Uart_Info[UART6_TEST].Tx_Buf[2] = pData[2];
        Uart_Info[UART6_TEST].Tx_Buf[3] = pData[3];
        Uart_Info[UART6_TEST].Tx_Buf[4] = word_cnt >> 8;
        Uart_Info[UART6_TEST].Tx_Buf[5] = word_cnt & 0xFF;
        
        p = &Uart_Info[UART6_TEST].Tx_Buf[6];
        
        for(i=0;i<word_cnt;i+=2)
        {
            *p++ = (*pWord >> 8) & 0xFF;
            *p++ = *pWord & 0xFF;
            
            *pWord2 = *pWord;
            
            pWord++;
            pWord2++;
        }
        
        cal_crc = crc16(&Uart_Info[UART6_TEST].Tx_Buf[0],6 + word_cnt);
        
        *p++ = cal_crc >> 8;
        *p++ = cal_crc;
        
        Uart_Info[UART6_TEST].Tx_Length = 6 + word_cnt + 2;
        
//        USART1_TX;
//        HAL_UART_Transmit_IT(&huart1,Uart_Info[UART6_TEST].Tx_Buf,Uart_Info[UART6_TEST].Tx_Length);
    }
	
    else if( upper_addr >= MEM_ADDR_COMP5 && upper_addr <= MEM_ADDR_COMP8 )
    {
        pWord = (unsigned short*)&Comp_Info[upper_addr - 0x11];
        pWord2 = (unsigned short*)&Comp_Info_3[upper_addr - 0x11];
        
        word_cnt = sizeof(Comp_Info[0]);
        
        Uart_Info[UART6_TEST].Tx_Buf[0] = 0x65;
        Uart_Info[UART6_TEST].Tx_Buf[1] = 0x13;
        Uart_Info[UART6_TEST].Tx_Buf[2] = pData[2];
        Uart_Info[UART6_TEST].Tx_Buf[3] = pData[3];
        Uart_Info[UART6_TEST].Tx_Buf[4] = word_cnt >> 8;
        Uart_Info[UART6_TEST].Tx_Buf[5] = word_cnt & 0xFF;
        
        p = &Uart_Info[UART6_TEST].Tx_Buf[6];
        
        for(i=0;i<word_cnt;i+=2)
        {
            *p++ = (*pWord >> 8) & 0xFF;
            *p++ = *pWord & 0xFF;
            
            *pWord2 = *pWord;
            
            pWord++;
            pWord2++;
        }
        
        cal_crc = crc16(&Uart_Info[UART6_TEST].Tx_Buf[0],6 + word_cnt);
        
        *p++ = cal_crc >> 8;
        *p++ = cal_crc;
        
        Uart_Info[UART6_TEST].Tx_Length = 6 + word_cnt + 2;
        
//        USART1_TX;
//        HAL_UART_Transmit_IT(&huart1,Uart_Info[UART6_TEST].Tx_Buf,Uart_Info[UART6_TEST].Tx_Length);
    }
	
    else if( upper_addr >= MEM_ADDR_IO_0xE0 && upper_addr <= MEM_ADDR_IO_0xEF )
    {
        pWord = (unsigned short*)&IO_Info[upper_addr - 0xE0];
        pWord2 = (unsigned short*)&IO_Info_3[upper_addr - 0xE0];
        
        word_cnt = sizeof(IO_Info[0]);
        
        Uart_Info[UART6_TEST].Tx_Buf[0] = 0x65;
        Uart_Info[UART6_TEST].Tx_Buf[1] = 0x13;
        Uart_Info[UART6_TEST].Tx_Buf[2] = pData[2];
        Uart_Info[UART6_TEST].Tx_Buf[3] = pData[3];
        Uart_Info[UART6_TEST].Tx_Buf[4] = word_cnt >> 8;
        Uart_Info[UART6_TEST].Tx_Buf[5] = word_cnt & 0xFF;
        
        p = &Uart_Info[UART6_TEST].Tx_Buf[6];
        
        for(i=0;i<word_cnt;i+=2)
        {
            *p++ = (*pWord >> 8) & 0xFF;
            *p++ = *pWord & 0xFF;
            
            *pWord2 = *pWord;
            
            pWord++;
            pWord2++;
        }
        
        cal_crc = crc16(&Uart_Info[UART6_TEST].Tx_Buf[0],6 + word_cnt);
        
        *p++ = cal_crc >> 8;
        *p++ = cal_crc;
        
        Uart_Info[UART6_TEST].Tx_Length = 6 + word_cnt + 2;
        
//        USART1_TX;
//        HAL_UART_Transmit_IT(&huart1,Uart_Info[UART6_TEST].Tx_Buf,Uart_Info[UART6_TEST].Tx_Length);
    }
    else if( upper_addr >= MEM_ADDR_20mA_0xF0 && upper_addr <= MEM_ADDR_20mA_0xFF )
    {
        pWord = (unsigned short*)&AI_Info[upper_addr - 0xF0];
        pWord2 = (unsigned short*)&AI_Info_3[upper_addr - 0xF0];
        
        word_cnt = sizeof(AI_Info[0]);
        
        Uart_Info[UART6_TEST].Tx_Buf[0] = 0x65;
        Uart_Info[UART6_TEST].Tx_Buf[1] = 0x13;
        Uart_Info[UART6_TEST].Tx_Buf[2] = pData[2];
        Uart_Info[UART6_TEST].Tx_Buf[3] = pData[3];
        Uart_Info[UART6_TEST].Tx_Buf[4] = word_cnt >> 8;
        Uart_Info[UART6_TEST].Tx_Buf[5] = word_cnt & 0xFF;
        
        p = &Uart_Info[UART6_TEST].Tx_Buf[6];
        
        for(i=0;i<word_cnt;i+=2)
        {
            *p++ = (*pWord >> 8) & 0xFF;
            *p++ = *pWord & 0xFF;
            
            *pWord2 = *pWord;
            
            pWord++;
            pWord2++;
        }
        
        cal_crc = crc16(&Uart_Info[UART6_TEST].Tx_Buf[0],6 + word_cnt);
        
        *p++ = cal_crc >> 8;
        *p++ = cal_crc;
        
        Uart_Info[UART6_TEST].Tx_Length = 6 + word_cnt + 2;
        
//        USART6_TX;
//        HAL_UART_Transmit_IT(&huart6,Uart_Info[UART6_TEST].Tx_Buf,Uart_Info[UART6_TEST].Tx_Length);
    }
}


void Uart6_Rcv_0x15_Data(unsigned char *pData)
{
    unsigned short word_buf, *pWord, *pWord2, word_cnt, byte_cnt, i, cnt, addr, cal_crc;
    unsigned char upper_addr, lower_addr, *p, state;
    
    addr = pData[2];
    addr <<= 8;
    addr |= pData[3];
    
    upper_addr = pData[2];
    lower_addr = pData[3];
    
    if( upper_addr == MEM_ADDR_TOTAL )
    {
        pWord = (unsigned short*)&Total_Info;
        pWord2 = (unsigned short*)&Total_Info_3;
        
        word_cnt = sizeof(Total_Info);        // 구조체길이
        
        Uart_Info[UART6_TEST].Tx_Buf[0] = 0x65;
        Uart_Info[UART6_TEST].Tx_Buf[1] = 0x15;
        
        p = &Uart_Info[UART6_TEST].Tx_Buf[4];
        Uart_Info[UART6_TEST].Tx_Length = 0;
        
        addr = 0;
        lower_addr = 0;     // 항상 0번지부터 스캔.
        
        for(i=0;i<word_cnt;i+=2)
        {
            if( lower_addr >= word_cnt )  break;      // 요청주소가 구조체길이보다 길면
            
            if( *pWord != *pWord2 )
            {
                *p++ = addr >> 8;
                *p++ = addr;
                *p++ = (*pWord >> 8) & 0xFF;
                *p++ = *pWord & 0xFF;
                
                Uart_Info[UART6_TEST].Tx_Length += 4;
            }
            
            *pWord2 = *pWord;
            
            pWord++;
            pWord2++;
            
            addr += 2;
            lower_addr += 2;
        }
        
        if( Uart_Info[UART6_TEST].Tx_Length == 0 )       // 변화된 데이터가 없으면 첫번째 주소값으로 응답
        {
            pWord = (unsigned short*)&Total_Info;
            
            *p++ = upper_addr;
            *p++ = 0;
            *p++ = (*pWord >> 8) & 0xFF;
            *p++ = *pWord & 0xFF;
            
            Uart_Info[UART6_TEST].Tx_Length += 4;
        }
        
        Uart_Info[UART6_TEST].Tx_Buf[2] = Uart_Info[UART6_TEST].Tx_Length >> 8;
        Uart_Info[UART6_TEST].Tx_Buf[3] = Uart_Info[UART6_TEST].Tx_Length;
        
        Uart_Info[UART6_TEST].Tx_Length += 4;            // 헤더 4바이트
        
        cal_crc = crc16(&Uart_Info[UART6_TEST].Tx_Buf[0],Uart_Info[UART6_TEST].Tx_Length);
        
        *p++ = cal_crc >> 8;
        *p++ = cal_crc;
        
        Uart_Info[UART6_TEST].Tx_Length += 2;
        
//        USART1_TX;
//        HAL_UART_Transmit_IT(&huart1,Uart_Info[UART6_TEST].Tx_Buf,Uart_Info[UART6_TEST].Tx_Length);
    }
    else if( upper_addr == MEM_ADDR_SYSTEM )
    {

    }
    else if( upper_addr == MEM_ADDR_COMP1)
    {
        pWord = (unsigned short*)&EXT_61850_Info.G_LINK_STATUS[0];
        pWord2 = (unsigned short*)&EXT_61850_Info_3.G_LINK_STATUS[0];
        
        word_cnt = sizeof(EXT_61850_Info.G_LINK_STATUS);
        
        Uart_Info[UART6_TEST].Tx_Buf[0] = 0x65;
        Uart_Info[UART6_TEST].Tx_Buf[1] = 0x15;
        
        p = &Uart_Info[UART6_TEST].Tx_Buf[4];
        Uart_Info[UART6_TEST].Tx_Length = 0;
        
        for(i=0;i<word_cnt;i+=2)
        {
            if( lower_addr >= word_cnt )  break;      // 요청주소가 구조체길이보다 길면
            
            if( *pWord != *pWord2 )
            {
                *p++ = addr >> 8;
                *p++ = addr;
                *p++ = (*pWord >> 8) & 0xFF;
                *p++ = *pWord & 0xFF;
                
                Uart_Info[UART6_TEST].Tx_Length += 4;
            }
            
            *pWord2 = *pWord;
            
            pWord++;
            pWord2++;
            
            addr += 2;
            lower_addr += 2;
        }
        
        if( Uart_Info[UART6_TEST].Tx_Length == 0 )       // 변화된 데이터가 없으면 첫번째 주소값으로 응답
        {
            pWord = (unsigned short*)&EXT_61850_Info.G_LINK_STATUS[0];
            
            *p++ = upper_addr;
            *p++ = 0;
            *p++ = (*pWord >> 8) & 0xFF;
            *p++ = *pWord & 0xFF;
            
            Uart_Info[UART6_TEST].Tx_Length += 4;
        }
        
        Uart_Info[UART6_TEST].Tx_Buf[2] = Uart_Info[UART6_TEST].Tx_Length >> 8;
        Uart_Info[UART6_TEST].Tx_Buf[3] = Uart_Info[UART6_TEST].Tx_Length;
        
        Uart_Info[UART6_TEST].Tx_Length += 4;            // 헤더 2바이트
        
        cal_crc = crc16(&Uart_Info[UART6_TEST].Tx_Buf[0],Uart_Info[UART6_TEST].Tx_Length);
        
        *p++ = cal_crc >> 8;
        *p++ = cal_crc;
        
        Uart_Info[UART6_TEST].Tx_Length += 2;
        
//        USART1_TX;
//        HAL_UART_Transmit_IT(&huart1,Uart_Info[UART6_TEST].Tx_Buf,Uart_Info[UART6_TEST].Tx_Length);
    }
    else if( upper_addr == MEM_ADDR_COMP2)
    {
        pWord = (unsigned short*)&EXT_61850_Info.FIRE_RECEPTION_STATUS[0];
        pWord2 = (unsigned short*)&EXT_61850_Info_3.FIRE_RECEPTION_STATUS[0];
        
        word_cnt = sizeof(EXT_61850_Info.FIRE_RECEPTION_STATUS);
        
        Uart_Info[UART6_TEST].Tx_Buf[0] = 0x65;
        Uart_Info[UART6_TEST].Tx_Buf[1] = 0x15;
        
        p = &Uart_Info[UART6_TEST].Tx_Buf[4];
        Uart_Info[UART6_TEST].Tx_Length = 0;
        
        for(i=0;i<word_cnt;i+=2)
        {
            if( lower_addr >= word_cnt )  break;      // 요청주소가 구조체길이보다 길면
            
            if( *pWord != *pWord2 )
            {
                *p++ = addr >> 8;
                *p++ = addr;
                *p++ = (*pWord >> 8) & 0xFF;
                *p++ = *pWord & 0xFF;
                
                Uart_Info[UART6_TEST].Tx_Length += 4;
            }
            
            *pWord2 = *pWord;
            
            pWord++;
            pWord2++;
            
            addr += 2;
            lower_addr += 2;
        }
        
        if( Uart_Info[UART6_TEST].Tx_Length == 0 )       // 변화된 데이터가 없으면 첫번째 주소값으로 응답
        {
            pWord = (unsigned short*)&EXT_61850_Info.FIRE_RECEPTION_STATUS[0];
            
            *p++ = upper_addr;
            *p++ = 0;
            *p++ = (*pWord >> 8) & 0xFF;
            *p++ = *pWord & 0xFF;
            
            Uart_Info[UART6_TEST].Tx_Length += 4;
        }
        
        Uart_Info[UART6_TEST].Tx_Buf[2] = Uart_Info[UART6_TEST].Tx_Length >> 8;
        Uart_Info[UART6_TEST].Tx_Buf[3] = Uart_Info[UART6_TEST].Tx_Length;
        
        Uart_Info[UART6_TEST].Tx_Length += 4;            // 헤더 2바이트
        
        cal_crc = crc16(&Uart_Info[UART6_TEST].Tx_Buf[0],Uart_Info[UART6_TEST].Tx_Length);
        
        *p++ = cal_crc >> 8;
        *p++ = cal_crc;
        
        Uart_Info[UART6_TEST].Tx_Length += 2;
        
//        USART1_TX;
//        HAL_UART_Transmit_IT(&huart1,Uart_Info[UART6_TEST].Tx_Buf,Uart_Info[UART6_TEST].Tx_Length);
    }
    else if( upper_addr == MEM_ADDR_COMP3)
    {
        pWord = (unsigned short*)&EXT_61850_Info.FIRE_REMOTE_CONTROL_STATUS[0];
        pWord2 = (unsigned short*)&EXT_61850_Info_3.FIRE_REMOTE_CONTROL_STATUS[0];
        
        word_cnt = sizeof(EXT_61850_Info.FIRE_RECEPTION_STATUS);
        
        Uart_Info[UART6_TEST].Tx_Buf[0] = 0x65;
        Uart_Info[UART6_TEST].Tx_Buf[1] = 0x15;
        
        p = &Uart_Info[UART6_TEST].Tx_Buf[4];
        Uart_Info[UART6_TEST].Tx_Length = 0;
        
        for(i=0;i<word_cnt;i+=2)
        {
            if( lower_addr >= word_cnt )  break;      // 요청주소가 구조체길이보다 길면
            
            if( *pWord != *pWord2 )
            {
                *p++ = addr >> 8;
                *p++ = addr;
                *p++ = (*pWord >> 8) & 0xFF;
                *p++ = *pWord & 0xFF;
                
                Uart_Info[UART6_TEST].Tx_Length += 4;
            }
            
            *pWord2 = *pWord;
            
            pWord++;
            pWord2++;
            
            addr += 2;
            lower_addr += 2;
        }
        
        if( Uart_Info[UART6_TEST].Tx_Length == 0 )       // 변화된 데이터가 없으면 첫번째 주소값으로 응답
        {
            pWord = (unsigned short*)&EXT_61850_Info.FIRE_REMOTE_CONTROL_STATUS[0];
            
            *p++ = upper_addr;
            *p++ = 0;
            *p++ = (*pWord >> 8) & 0xFF;
            *p++ = *pWord & 0xFF;
            
            Uart_Info[UART6_TEST].Tx_Length += 4;
        }
        
        Uart_Info[UART6_TEST].Tx_Buf[2] = Uart_Info[UART6_TEST].Tx_Length >> 8;
        Uart_Info[UART6_TEST].Tx_Buf[3] = Uart_Info[UART6_TEST].Tx_Length;
        
        Uart_Info[UART6_TEST].Tx_Length += 4;            // 헤더 2바이트
        
        cal_crc = crc16(&Uart_Info[UART6_TEST].Tx_Buf[0],Uart_Info[UART6_TEST].Tx_Length);
        
        *p++ = cal_crc >> 8;
        *p++ = cal_crc;
        
        Uart_Info[UART6_TEST].Tx_Length += 2;
        
//        USART1_TX;
//        HAL_UART_Transmit_IT(&huart1,Uart_Info[UART6_TEST].Tx_Buf,Uart_Info[UART6_TEST].Tx_Length);
    }
    else if( upper_addr == MEM_ADDR_COMP4)
    {
        pWord = (unsigned short*)&EXT_61850_Info.UNMANNED_SECURITY[0];
        pWord2 = (unsigned short*)&EXT_61850_Info_3.UNMANNED_SECURITY[0];
        
        word_cnt = sizeof(EXT_61850_Info.UNMANNED_SECURITY);
        
        Uart_Info[UART6_TEST].Tx_Buf[0] = 0x65;
        Uart_Info[UART6_TEST].Tx_Buf[1] = 0x15;
        
        p = &Uart_Info[UART6_TEST].Tx_Buf[4];
        Uart_Info[UART6_TEST].Tx_Length = 0;
        
        for(i=0;i<word_cnt;i+=2)
        {
            if( lower_addr >= word_cnt )  break;      // 요청주소가 구조체길이보다 길면
            
            if( *pWord != *pWord2 )
            {
                *p++ = addr >> 8;
                *p++ = addr;
                *p++ = (*pWord >> 8) & 0xFF;
                *p++ = *pWord & 0xFF;
                
                Uart_Info[UART6_TEST].Tx_Length += 4;
            }
            
            *pWord2 = *pWord;
            
            pWord++;
            pWord2++;
            
            addr += 2;
            lower_addr += 2;
        }
        
        if( Uart_Info[UART6_TEST].Tx_Length == 0 )       // 변화된 데이터가 없으면 첫번째 주소값으로 응답
        {
            pWord = (unsigned short*)&EXT_61850_Info.UNMANNED_SECURITY[0];
            
            *p++ = upper_addr;
            *p++ = 0;
            *p++ = (*pWord >> 8) & 0xFF;
            *p++ = *pWord & 0xFF;
            
            Uart_Info[UART6_TEST].Tx_Length += 4;
        }
        
        Uart_Info[UART6_TEST].Tx_Buf[2] = Uart_Info[UART6_TEST].Tx_Length >> 8;
        Uart_Info[UART6_TEST].Tx_Buf[3] = Uart_Info[UART6_TEST].Tx_Length;
        
        Uart_Info[UART6_TEST].Tx_Length += 4;            // 헤더 2바이트
        
        cal_crc = crc16(&Uart_Info[UART6_TEST].Tx_Buf[0],Uart_Info[UART6_TEST].Tx_Length);
        
        *p++ = cal_crc >> 8;
        *p++ = cal_crc;
        
        Uart_Info[UART6_TEST].Tx_Length += 2;
        
//        USART1_TX;
//        HAL_UART_Transmit_IT(&huart1,Uart_Info[UART6_TEST].Tx_Buf,Uart_Info[UART6_TEST].Tx_Length);
    }
	
    else if( upper_addr >= MEM_ADDR_COMP5 && upper_addr <= MEM_ADDR_COMP8 )
    {
        pWord = (unsigned short*)&Comp_Info[upper_addr - MEM_ADDR_COMP1];
        pWord2 = (unsigned short*)&Comp_Info_3[upper_addr - MEM_ADDR_COMP1];
        
        word_cnt = sizeof(Comp_Info[0]);        // 구조체길이
        
        Uart_Info[UART6_TEST].Tx_Buf[0] = 0x65;
        Uart_Info[UART6_TEST].Tx_Buf[1] = 0x15;
        
        p = &Uart_Info[UART6_TEST].Tx_Buf[4];
        Uart_Info[UART6_TEST].Tx_Length = 0;
        
        for(i=0;i<word_cnt;i+=2)
        {
            if( lower_addr >= word_cnt )  break;      // 요청주소가 구조체길이보다 길면
            
            if( *pWord != *pWord2 )
            {
                *p++ = addr >> 8;
                *p++ = addr;
                *p++ = (*pWord >> 8) & 0xFF;
                *p++ = *pWord & 0xFF;
                
                Uart_Info[UART6_TEST].Tx_Length += 4;
            }
            
            *pWord2 = *pWord;
            
            pWord++;
            pWord2++;
            
            addr += 2;
            lower_addr += 2;
        }
        
        if( Uart_Info[UART6_TEST].Tx_Length == 0 )       // 변화된 데이터가 없으면 첫번째 주소값으로 응답
        {
            pWord = (unsigned short*)&Comp_Info[upper_addr - MEM_ADDR_COMP1];
            
            *p++ = upper_addr;
            *p++ = 0;
            *p++ = (*pWord >> 8) & 0xFF;
            *p++ = *pWord & 0xFF;
            
            Uart_Info[UART6_TEST].Tx_Length += 4;
        }
        
        Uart_Info[UART6_TEST].Tx_Buf[2] = Uart_Info[UART6_TEST].Tx_Length >> 8;
        Uart_Info[UART6_TEST].Tx_Buf[3] = Uart_Info[UART6_TEST].Tx_Length;
        
        Uart_Info[UART6_TEST].Tx_Length += 4;            // 헤더 2바이트
        
        cal_crc = crc16(&Uart_Info[UART6_TEST].Tx_Buf[0],Uart_Info[UART6_TEST].Tx_Length);
        
        *p++ = cal_crc >> 8;
        *p++ = cal_crc;
        
        Uart_Info[UART6_TEST].Tx_Length += 2;
        
//        USART1_TX;
//        HAL_UART_Transmit_IT(&huart1,Uart_Info[UART6_TEST].Tx_Buf,Uart_Info[UART6_TEST].Tx_Length);
    }
    else if( upper_addr >= MEM_ADDR_IO_0xE0 && upper_addr <= MEM_ADDR_IO_0xEF )
    {
        pWord = (unsigned short*)&IO_Info[upper_addr - MEM_ADDR_IO_0xE0];
        pWord2 = (unsigned short*)&IO_Info_3[upper_addr - MEM_ADDR_IO_0xE0];
        
        word_cnt = sizeof(IO_Info[0]);        // 구조체길이
        
        Uart_Info[UART6_TEST].Tx_Buf[0] = 0x65;
        Uart_Info[UART6_TEST].Tx_Buf[1] = 0x15;
        
        p = &Uart_Info[UART6_TEST].Tx_Buf[4];
        Uart_Info[UART6_TEST].Tx_Length = 0;
        
        for(i=0;i<word_cnt;i+=2)
        {
            if( lower_addr >= word_cnt )  break;      // 요청주소가 구조체길이보다 길면
            
            if( *pWord != *pWord2 )
            {
                *p++ = addr >> 8;
                *p++ = addr;
                *p++ = (*pWord >> 8) & 0xFF;
                *p++ = *pWord & 0xFF;
                
                Uart_Info[UART6_TEST].Tx_Length += 4;
            }
            
            *pWord2 = *pWord;
            
            pWord++;
            pWord2++;
            
            addr += 2;
            lower_addr += 2;
        }
        
        if( Uart_Info[UART6_TEST].Tx_Length == 0 )       // 변화된 데이터가 없으면 첫번째 주소값으로 응답
        {
            pWord = (unsigned short*)&IO_Info[upper_addr - MEM_ADDR_IO_0xE0];
            
            *p++ = upper_addr;
            *p++ = 0;
            *p++ = (*pWord >> 8) & 0xFF;
            *p++ = *pWord & 0xFF;
            
            Uart_Info[UART6_TEST].Tx_Length += 4;
        }
        
        Uart_Info[UART6_TEST].Tx_Buf[2] = Uart_Info[UART6_TEST].Tx_Length >> 8;
        Uart_Info[UART6_TEST].Tx_Buf[3] = Uart_Info[UART6_TEST].Tx_Length;
        
        Uart_Info[UART6_TEST].Tx_Length += 4;            // 헤더 2바이트
        
        cal_crc = crc16(&Uart_Info[UART6_TEST].Tx_Buf[0],Uart_Info[UART6_TEST].Tx_Length);
        
        *p++ = cal_crc >> 8;
        *p++ = cal_crc;
        
        Uart_Info[UART6_TEST].Tx_Length += 2;
        
//        USART1_TX;
//        HAL_UART_Transmit_IT(&huart1,Uart_Info[UART6_TEST].Tx_Buf,Uart_Info[UART6_TEST].Tx_Length);
    }
    else if( upper_addr >= MEM_ADDR_20mA_0xF0 && upper_addr <= MEM_ADDR_20mA_0xFF )
    {
        pWord = (unsigned short*)&AI_Info[upper_addr - MEM_ADDR_20mA_0xF0];
        pWord2 = (unsigned short*)&AI_Info_3[upper_addr - MEM_ADDR_20mA_0xF0];
        
        word_cnt = sizeof(AI_Info[0]);        // 구조체길이
        
        Uart_Info[UART6_TEST].Tx_Buf[0] = 0x65;
        Uart_Info[UART6_TEST].Tx_Buf[1] = 0x15;
        
        p = &Uart_Info[UART6_TEST].Tx_Buf[4];
        Uart_Info[UART6_TEST].Tx_Length = 0;
        
        for(i=0;i<word_cnt;i+=2)
        {
            if( lower_addr >= word_cnt )  break;      // 요청주소가 구조체길이보다 길면
            
            if( *pWord != *pWord2 )
            {
                *p++ = addr >> 8;
                *p++ = addr;
                *p++ = (*pWord >> 8) & 0xFF;
                *p++ = *pWord & 0xFF;
                
                Uart_Info[UART6_TEST].Tx_Length += 4;
            }
            
            *pWord2 = *pWord;
            
            pWord++;
            pWord2++;
            
            addr += 2;
            lower_addr += 2;
        }
        
        if( Uart_Info[UART6_TEST].Tx_Length == 0 )       // 변화된 데이터가 없으면 첫번째 주소값으로 응답
        {
            pWord = (unsigned short*)&AI_Info[upper_addr - MEM_ADDR_20mA_0xF0];
            
            *p++ = upper_addr;
            *p++ = 0;
            *p++ = (*pWord >> 8) & 0xFF;
            *p++ = *pWord & 0xFF;
            
            Uart_Info[UART6_TEST].Tx_Length += 4;
        }
        
        Uart_Info[UART6_TEST].Tx_Buf[2] = Uart_Info[UART6_TEST].Tx_Length >> 8;
        Uart_Info[UART6_TEST].Tx_Buf[3] = Uart_Info[UART6_TEST].Tx_Length;
        
        Uart_Info[UART6_TEST].Tx_Length += 4;            // 헤더 2바이트
        
        cal_crc = crc16(&Uart_Info[UART6_TEST].Tx_Buf[0],Uart_Info[UART6_TEST].Tx_Length);
        
        *p++ = cal_crc >> 8;
        *p++ = cal_crc;
        
        Uart_Info[UART6_TEST].Tx_Length += 2;
        
//        USART6_TX;
//        HAL_UART_Transmit_IT(&huart6,Uart_Info[UART6_TEST].Tx_Buf,Uart_Info[UART6_TEST].Tx_Length);
    }
}

void Uart6_Rcv_0x20_Data(unsigned char *pData)
{
    unsigned short word_buf, *pWord, *pWord2, word_cnt, byte_cnt, i, cnt, addr, cal_crc, last_addr, size;
    unsigned char upper_addr, lower_addr, *p, set_time = 0;
    
	addr = pData[2];
	addr <<= 8;
	addr |= pData[3];

	upper_addr = pData[2];
	lower_addr = pData[3];
   
    	if( upper_addr == MEM_ADDR_TOTAL )
    	{
		byte_cnt = pData[4];
		byte_cnt <<= 8;
		byte_cnt |= pData[5];

		word_cnt = byte_cnt / 2;        // byte -> word 카운트로

		pWord = (unsigned short*)&Total_Info;
		size = sizeof(Total_Info);

		pWord += lower_addr / 2;

		cnt = 6;

		for(i=0;i<word_cnt;i++)
		{
			if( size <= lower_addr )     break;
			
			word_buf = pData[cnt++];            word_buf <<= 8;            word_buf |= pData[cnt++];

			if( lower_addr >= ((unsigned char*)&Total_Info.Year_Week - (unsigned char*)&Total_Info) )
			{
				set_time = 1;   // 시간
			}
			else if( lower_addr == ((unsigned char*)&Total_Info.SYSTEM_CONT - (unsigned char*)&Total_Info) )
			{
				if(word_buf==100)
				{
					Total_Data_Init();	
					HAL_NVIC_SystemReset();
				}
				else if(word_buf==101)	
					HAL_NVIC_SystemReset();
			}
			else if( lower_addr < ((unsigned char*)&Total_Info.SYSTEM_CONT - (unsigned char*)&Total_Info) )
			{
		    		Write_Fram(TOTAL_DATA_ADDRESS + lower_addr,(unsigned char*)&word_buf,2);
		 	}
		    
		    	*pWord++ = word_buf;

		    	lower_addr += 2;
		}

		if( set_time )      
			Set_Date_Time();	
    	}
    	else if( upper_addr == MEM_ADDR_SYSTEM )
    	{

    	}
    	else if( upper_addr == MEM_ADDR_COMP1)	//종합반 	0x11
    	{
			
    	}
    	else if( upper_addr == MEM_ADDR_COMP2)	// 화재수신반	0x12
    	{
		byte_cnt = pData[4];		byte_cnt <<= 8;		byte_cnt |= pData[5];		word_cnt = byte_cnt / 2;       

		cnt = 6;	
					
		pWord = (unsigned short*)&EXT_61850_Info.FIRE_RECEPTION_STATUS[0];
		size = sizeof(EXT_61850_Info.FIRE_RECEPTION_STATUS);

		pWord += lower_addr / 2;

		cnt = 6;

		for(i=0;i<word_cnt;i++)
		{
			word_buf = pData[cnt++];            
			word_buf <<= 8;           
			word_buf |= pData[cnt++];
			
			if( size <= lower_addr )     break;
			
	    		*pWord++ = word_buf;

		    	lower_addr += 2;
		}

    	}
	else if( upper_addr == MEM_ADDR_COMP3)	//원격제어반 	0x13
	{
		byte_cnt = pData[4];		byte_cnt <<= 8;		byte_cnt |= pData[5];		word_cnt = byte_cnt / 2;       

		cnt = 6;	
					
		pWord = (unsigned short*)&EXT_61850_Info.FIRE_REMOTE_CONTROL_STATUS[0];
		size = sizeof(EXT_61850_Info.FIRE_REMOTE_CONTROL_STATUS);

		pWord += lower_addr / 2;

		cnt = 6;

		for(i=0;i<word_cnt;i++)
		{
			word_buf = pData[cnt++];            
			word_buf <<= 8;            
			word_buf |= pData[cnt++];
			
			if( lower_addr == 0x70)
			{
				if(word_buf & 0x0001)	Total_Info.RUN_STOP_STATE=1;
				else if(word_buf & 0x0002)	Total_Info.RUN_STOP_STATE=0;
			}
			else if( lower_addr == 0x72)
			{
				Total_Info.ON_CH = word_buf;
			}
			
			//
			if( size <= lower_addr )     break;
			
	    		*pWord++ = word_buf;

		    	lower_addr += 2;
		}
    	}
	else if( upper_addr == MEM_ADDR_COMP4)	//경보수신반 	0x14
    	{
		byte_cnt = pData[4];		byte_cnt <<= 8;		byte_cnt |= pData[5];		word_cnt = byte_cnt / 2;       

		cnt = 6;	
					
		pWord = (unsigned short*)&EXT_61850_Info.UNMANNED_SECURITY[0];
		size = sizeof(EXT_61850_Info.UNMANNED_SECURITY);

		pWord += lower_addr / 2;

		cnt = 6;

		for(i=0;i<word_cnt;i++)
		{
			word_buf = pData[cnt++];            
			word_buf <<= 8;            
			word_buf |= pData[cnt++];
			
	    		*pWord++ = word_buf;

			if( size <= lower_addr )     break;
			
		    	lower_addr += 2;
		}
    	
    	}
    	else if( upper_addr == MEM_ADDR_IO_0xE0 )
    	{
		byte_cnt = pData[4];
		byte_cnt <<= 8;
		byte_cnt |= pData[5];

		word_cnt = byte_cnt / 2;

		pWord = (unsigned short*)&IO_Info[0];

		pWord += lower_addr / 2;

		cnt = 6;

		size = sizeof(IO_Info[0]) / 2;
		if( (word_cnt + (lower_addr / 2)) > size )      // 쓰기길이의 메모리주소 초과검사.
		    	word_cnt = size - (lower_addr / 2);

		for(i=0;i<word_cnt;i++)
		{
			word_buf = pData[cnt++];
			word_buf <<= 8;
			word_buf |= pData[cnt++];

			*pWord++ = word_buf;

			//FRAM_Multi_Byte_Write_S(REAL_DATA_ADDRESS + lower_addr,(unsigned char*)&word_buf,2);

			lower_addr += 2;
		}

		if( IO_Info[0].EXT_CMD == 1 )      IO_Info[0].OUTPUT_STATUS &= ~0x0001;
		if( IO_Info[0].EXT_CMD == 2 )      IO_Info[0].OUTPUT_STATUS |= 0x0001;

		if( IO_Info[0].EXT_CMD == 3 )      IO_Info[0].OUTPUT_STATUS &= ~0x0002;
		if( IO_Info[0].EXT_CMD == 4 )      IO_Info[0].OUTPUT_STATUS |= 0x0002;

		if( IO_Info[0].EXT_CMD == 5 )      IO_Info[0].OUTPUT_STATUS &= ~0x0004;
		if( IO_Info[0].EXT_CMD == 6 )      IO_Info[0].OUTPUT_STATUS |= 0x0004;

		if( IO_Info[0].EXT_CMD == 7 )      IO_Info[0].OUTPUT_STATUS &= ~0x0008;
		if( IO_Info[0].EXT_CMD == 8 )      IO_Info[0].OUTPUT_STATUS |= 0x0008;
/*
		if( IO_Info[0].EXT_CMD == 9 )      IO_Info[0].OUTPUT_STATUS &= ~0x0010;
		if( IO_Info[0].EXT_CMD == 10 )      IO_Info[0].OUTPUT_STATUS |= 0x0010;

		if( IO_Info[0].EXT_CMD == 11 )      IO_Info[0].OUTPUT_STATUS &= ~0x0020;
		if( IO_Info[0].EXT_CMD == 12 )      IO_Info[0].OUTPUT_STATUS |= 0x0020;

		if( IO_Info[0].EXT_CMD == 13 )      IO_Info[0].OUTPUT_STATUS &= ~0x0040;
		if( IO_Info[0].EXT_CMD == 14 )      IO_Info[0].OUTPUT_STATUS |= 0x0040;

		if( IO_Info[0].EXT_CMD == 15 )      IO_Info[0].OUTPUT_STATUS &= ~0x0080;
		if( IO_Info[0].EXT_CMD == 16 )      IO_Info[0].OUTPUT_STATUS |= 0x0080;
*/
		IO_Info[0].EXT_CMD = 0;
    	}
}

void Uart6_Tx_Process(void)
{
    if( Uart_Info[UART6_TEST].Tx_Timeout > 1 )   return;
    
    if( Uart_Info[UART6_TEST].Tx_Timeout == 1 )
    {
        Uart_Info[UART6_TEST].Tx_Timeout = 0;
        
        //USART6_TX;
        HAL_UART_Transmit_IT(&huart6,Uart_Info[UART6_TEST].Tx_Buf,Uart_Info[UART6_TEST].Tx_Length);
    }
}

void Uart6_Rx_Process(void)
{
    unsigned short cal_crc, rcv_crc;
    
    if( Uart_Info[UART6_TEST].Rcv_Pkt == SET )
    {
        Uart_Info[UART6_TEST].Rcv_Pkt = CLR;
    
        cal_crc = crc16((unsigned char*)Uart_Info[UART6_TEST].Rx_Buf, Uart_Info[UART6_TEST].Rx_Cnt - 2);
		
        rcv_crc = Uart_Info[UART6_TEST].Rx_Buf[Uart_Info[UART6_TEST].Rx_Cnt - 2];
        rcv_crc <<= 8;
        rcv_crc |= Uart_Info[UART6_TEST].Rx_Buf[Uart_Info[UART6_TEST].Rx_Cnt - 1];  

        if( cal_crc == rcv_crc )                            // 패킷수신.
        {
            Uart_Info[UART6_TEST].Link_Time = 3000;
            
            if( Uart_Info[UART6_TEST].Rx_Buf[1] == 0x13 )           // 0x13 수신. 전체
            {
                Uart6_Rcv_0x13_Data(&Uart_Info[UART6_TEST].Rx_Buf[0]);
                Uart_Info[UART6_TEST].Tx_Timeout = 5;
				
            }
            else if( Uart_Info[UART6_TEST].Rx_Buf[1] == 0x15 )      // 0x15 수신. 변화
            {
                Uart6_Rcv_0x15_Data(&Uart_Info[UART6_TEST].Rx_Buf[0]);
                Uart_Info[UART6_TEST].Tx_Timeout = 5;
            }
            else if( Uart_Info[UART6_TEST].Rx_Buf[1] == 0x20 )
            {
                Uart6_Rcv_0x20_Data(&Uart_Info[UART6_TEST].Rx_Buf[0]);
                
                Uart_Info[UART6_TEST].Rx_Buf[3] = 0x00;          // 0x20 -> 0x15
                Uart_Info[UART6_TEST].Rx_Buf[4] = 0x00;
                Uart_Info[UART6_TEST].Rx_Buf[5] = 0x00;
                
                Uart6_Rcv_0x15_Data(&Uart_Info[UART6_TEST].Rx_Buf[0]);
                Uart_Info[UART6_TEST].Tx_Timeout = 5;
            }
            
            Uart_Info[UART6_TEST].Rx_Timeout = 0;
        }
    }
}

