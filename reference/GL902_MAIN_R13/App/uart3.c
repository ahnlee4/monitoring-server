#include "stm32f4xx_hal.h"
#include "memory_map.h"
#include "delay.h"
#include "uart3.h"

extern UART_HandleTypeDef huart3;       // 장비 데이터 수집.

void USART3_ISR(void)
{
    unsigned short rcv_length;
    unsigned char RxData;
    

    if( Uart_Info[UART3_422].Rx_Timeout == 0 )   Uart_Info[UART3_422].Rx_Cnt = 0;
    if( Uart_Info[UART3_422].Rx_Cnt > 275 )   Uart_Info[UART3_422].Rx_Cnt = 0;
    
    RxData = USART3->DR;

    if(R222_TX_STATUS==SET)
    {
    	Uart_Info[UART3_422].Rx_Cnt = 0;
 	Uart_Info[UART3_422].Rx_Timeout = 10;
	return;
    }
    
    if( Uart_Info[UART3_422].Rx_Cnt == 0  && RxData == Uart_Info[UART3_422].Call_Id )			// ID 검사
    {
        Uart_Info[UART3_422].Rx_Buf[Uart_Info[UART3_422].Rx_Cnt++] = RxData;
    }
    else if( Uart_Info[UART3_422].Rx_Cnt == 1 && RxData == 0x04)					// 쓰기, 읽기 명령. 0x03, 0x10 은 모드버스.
    {
        Uart_Info[UART3_422].Rx_Buf[Uart_Info[UART3_422].Rx_Cnt++] = RxData;
    }
    else if( Uart_Info[UART3_422].Rx_Cnt >= 2 )
    {
        if( Uart_Info[UART3_422].Rx_Buf[1] == 0x04 )
        {
            if( Uart_Info[UART3_422].Rx_Cnt == 2 )
            {
                Uart_Info[UART3_422].Rx_Buf[Uart_Info[UART3_422].Rx_Cnt++] = RxData;
                Uart_Info[UART3_422].rcv_length = RxData;
            }
            else if( Uart_Info[UART3_422].Rx_Cnt >= 3 )
            {
                Uart_Info[UART3_422].Rx_Buf[Uart_Info[UART3_422].Rx_Cnt++] = RxData;

                if( Uart_Info[UART3_422].Rx_Cnt == (3 +  Uart_Info[UART3_422].rcv_length + 2) )
                    Uart_Info[UART3_422].Rcv_Pkt = SET;
            }
        }
        else
            Uart_Info[UART3_422].Rx_Cnt = 0;
    }
    else
        Uart_Info[UART3_422].Rx_Cnt = 0;
    
    Uart_Info[UART3_422].Rx_Timeout = 10;
}

void Uart3_Rcv_0x03_Data(unsigned char *pData)
{
    unsigned short word_buf,  *pWord2, word_cnt, byte_cnt, i, cnt, addr, cal_crc;
    unsigned char upper_addr, lower_addr, *p, *pByte ;
    
        byte_cnt = pData[2];


        pByte = (unsigned char*)&POWER_Info[Uart_Info[UART3_422].Call_Id - 1];

        cnt = 3;

        for(i=0; i<byte_cnt; i++)
            *pByte++ = pData[cnt++];
			
}

void Uart3_Rcv_0x10_Data(unsigned char *pData)
{
    unsigned short word_buf, *pWord, *pWord2, word_cnt, byte_cnt, i, cnt, addr, cal_crc;
    unsigned char upper_addr, lower_addr, *p;
    
    ;
}

void Uart3_Rcv_0x06_Data(unsigned char *pData)
{
    unsigned short word_buf, *pWord, *pWord2, word_cnt, byte_cnt, i, cnt, addr, cal_crc;
    unsigned char upper_addr, lower_addr, *p, buf;
    
    ;
}

void Uart3_Tx_Process(void)
{
    unsigned short cal_crc;
    unsigned char io_device;
	
    
    if( Uart_Info[UART3_422].Tx_Timeout > 1 )   return;

	io_device = (Total_Info.USE_COMP_QTY >> 0) & 0xFF;

	if(Uart_Info[UART3_422].Call_Id++ >= io_device)
		Uart_Info[UART3_422].Call_Id=1;
	
	if(Uart_Info[UART3_422].Link_Time ==0)
		DRYER_Info[Uart_Info[UART3_422].Call_Id-1].INPUT_STATUS=0;

        Uart_Info[UART3_422].Tx_Buf[0] = Uart_Info[UART3_422].Call_Id;
        Uart_Info[UART3_422].Tx_Buf[1] = 0x04;
		
        Uart_Info[UART3_422].Tx_Buf[2] = 0x00;	//0x9C	
        Uart_Info[UART3_422].Tx_Buf[3] = 0x00;	//0x4F	//40015번지 //0x40	//40000번지 
		
        Uart_Info[UART3_422].Tx_Buf[4] = 0x00;
        Uart_Info[UART3_422].Tx_Buf[5] = 0x24;

        Uart_Info[UART3_422].Tx_Length = 6;
        
        cal_crc = crc16(&Uart_Info[UART3_422].Tx_Buf[0],Uart_Info[UART3_422].Tx_Length);
		
	Uart_Info[UART3_422].Tx_Buf[6] = cal_crc >> 8;
	Uart_Info[UART3_422].Tx_Buf[7] = cal_crc & 0xFF;
	
        Uart_Info[UART3_422].Tx_Length +=2;
		
        USART3_TX;	Uart_Info[UART3_422].TxOn_Sig=20;	R222_TX_STATUS=SET;
        HAL_UART_Transmit_IT(&huart3,Uart_Info[UART3_422].Tx_Buf,Uart_Info[UART3_422].Tx_Length);
        
        Uart_Info[UART3_422].Tx_Timeout = 500;
}

void Uart3_Rx_Process(void)
{
    unsigned short cal_crc, rcv_crc;
    
    if( Uart_Info[UART3_422].Rcv_Pkt == SET )
    {
        Uart_Info[UART3_422].Rcv_Pkt = CLR;

        cal_crc = crc16((unsigned char*)Uart_Info[UART3_422].Rx_Buf, Uart_Info[UART3_422].Rx_Cnt - 2);
		
        rcv_crc = Uart_Info[UART3_422].Rx_Buf[Uart_Info[UART3_422].Rx_Cnt -2];
        rcv_crc <<= 8;
        rcv_crc |= Uart_Info[UART3_422].Rx_Buf[Uart_Info[UART3_422].Rx_Cnt - 1 ];

        if( cal_crc == rcv_crc )                            // 패킷수신.
        {
	      	Uart_Info[UART3_422].Link_Time = 3000;
					
            if( Uart_Info[UART3_422].Rx_Buf[1] == 0x04 )           // 0x03 수신. 멀티리드
            {
            	  Uart3_Rcv_0x03_Data(&Uart_Info[UART3_422].Rx_Buf[0]);
		  Uart_Info[UART3_422].Tx_Timeout = 100;

            }
            else if( Uart_Info[UART3_422].Rx_Buf[1] == 0x10 )      // 0x10 수신. 멀티라이트
            {
                ;//Uart3_Rcv_0x10_Data(&Uart_Info[UART3_422].Rx_Buf[0]);
            }
            else if( Uart_Info[UART3_422].Rx_Buf[1] == 0x06 )      // 0x06 수신. 싱글라이트
            {
                ;//Uart3_Rcv_0x06_Data(&Uart_Info[UART3_422].Rx_Buf[0]);
            }
            else 
		return;
        }
    }
}
	

