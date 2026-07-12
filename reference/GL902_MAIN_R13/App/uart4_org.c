#include "stm32f4xx_hal.h"
#include "memory_map.h"
#include "delay.h"
#include "uart4.h"

extern UART_HandleTypeDef huart4;       // 장비 데이터 수집.

void USART4_ISR(void)
{
    unsigned short rcv_length;
    unsigned char RxData;
    
    if( Uart_Info[UART4_485].Rx_Timeout == 0 )   Uart_Info[UART4_485].Rx_Cnt = 0;
    if( Uart_Info[UART4_485].Rx_Cnt > 275 )   Uart_Info[UART4_485].Rx_Cnt = 0;
    
    RxData = UART4->DR;
    
    if( Uart_Info[UART4_485].Rx_Cnt == 0  && RxData == 0x65 )			// ID 검사
    {
        Uart_Info[UART4_485].Rx_Buf[Uart_Info[UART4_485].Rx_Cnt++] = RxData;
    }
    else if( Uart_Info[UART4_485].Rx_Cnt == 1 && (RxData == 0x13 || RxData == 0x15 || RxData == 0x03 || RxData == 0x10) )					// 쓰기, 읽기 명령. 0x03, 0x10 은 모드버스.
    {
        Uart_Info[UART4_485].Rx_Buf[Uart_Info[UART4_485].Rx_Cnt++] = RxData;
    }
    else if( Uart_Info[UART4_485].Rx_Cnt >= 2 )
    {
        if( Uart_Info[UART4_485].Rx_Buf[1] == 0x13 )
        {
            if( Uart_Info[UART4_485].Rx_Cnt == 2 )					// 상위 주소
            {
                Uart_Info[UART4_485].Rx_Buf[Uart_Info[UART4_485].Rx_Cnt++] = RxData;
            }
            else if( Uart_Info[UART4_485].Rx_Cnt == 3 )					// 하위 주소
            {
                Uart_Info[UART4_485].Rx_Buf[Uart_Info[UART4_485].Rx_Cnt++] = RxData;
            }
            else if( Uart_Info[UART4_485].Rx_Cnt == 4 )					// 데이터 길이
            {
                Uart_Info[UART4_485].Rx_Buf[Uart_Info[UART4_485].Rx_Cnt++] = RxData;
            }
            else if( Uart_Info[UART4_485].Rx_Cnt == 5 )					// 데이터 길이
            {
                Uart_Info[UART4_485].Rx_Buf[Uart_Info[UART4_485].Rx_Cnt++] = RxData;
            }
            else if( Uart_Info[UART4_485].Rx_Cnt >= 6 )
            {
                rcv_length = (Uart_Info[UART4_485].Rx_Buf[4] << 8 | Uart_Info[UART4_485].Rx_Buf[5]);

                Uart_Info[UART4_485].Rx_Buf[Uart_Info[UART4_485].Rx_Cnt++] = RxData;

                if( Uart_Info[UART4_485].Rx_Cnt == (6 + rcv_length + 2) )		// 헤더 + 데이터 + CRC
                    Uart_Info[UART4_485].Rcv_Pkt = SET;
            }
            else
            {
                Uart_Info[UART4_485].Rx_Cnt = 0;
            }
        }
        else if( Uart_Info[UART4_485].Rx_Buf[1] == 0x15 )
        {
            if( Uart_Info[UART4_485].Rx_Cnt == 2 )					// 상위 주소
            {
                Uart_Info[UART4_485].Rx_Buf[Uart_Info[UART4_485].Rx_Cnt++] = RxData;
            }
            else if( Uart_Info[UART4_485].Rx_Cnt == 3 )					// 하위 주소
            {
                Uart_Info[UART4_485].Rx_Buf[Uart_Info[UART4_485].Rx_Cnt++] = RxData;
            }
            else if( Uart_Info[UART4_485].Rx_Cnt >= 4 )					// 데이터 길이
            {
                rcv_length = (Uart_Info[UART4_485].Rx_Buf[2] << 8 | Uart_Info[UART4_485].Rx_Buf[3]);

                Uart_Info[UART4_485].Rx_Buf[Uart_Info[UART4_485].Rx_Cnt++] = RxData;

                if( Uart_Info[UART4_485].Rx_Cnt == (4 + rcv_length + 2) )		// 헤더 + 데이터 + CRC
                    Uart_Info[UART4_485].Rcv_Pkt = SET;
            }
            else
            {
                Uart_Info[UART4_485].Rx_Cnt = 0;
            }
        }
        else if( Uart_Info[UART4_485].Rx_Buf[1] == 0x03 )
        {
            if( Uart_Info[UART4_485].Rx_Cnt == 2 )
            {
                Uart_Info[UART4_485].Rx_Buf[Uart_Info[UART4_485].Rx_Cnt++] = RxData;
                rcv_length = RxData;
            }
            else if( Uart_Info[UART4_485].Rx_Cnt >= 3 )
            {
                Uart_Info[UART4_485].Rx_Buf[Uart_Info[UART4_485].Rx_Cnt++] = RxData;

                if( Uart_Info[UART4_485].Rx_Cnt == (3 + rcv_length + 2) )
                    Uart_Info[UART4_485].Rcv_Pkt = SET;
            }
        }
        else
            Uart_Info[UART4_485].Rx_Cnt = 0;
    }
    else
        Uart_Info[UART4_485].Rx_Cnt = 0;
    
    Uart_Info[UART4_485].Rx_Timeout = 10;
}

void Uart4_Rcv_0x13_Data(unsigned char *pData)
{
    unsigned short word_buf, *pWord, word_cnt, byte_cnt, i, cnt, addr, MocomType;
    unsigned char upper_addr, lower_addr;
    
    addr = pData[2];
    addr <<= 8;
    addr |= pData[3];
    
    upper_addr = pData[2];
    lower_addr = pData[3];
    
    if( Uart_Info[UART4_485].Call_Id >= MEM_ADDR_COMP1 && Uart_Info[UART4_485].Call_Id <= MEM_ADDR_COMP8 )
    {
        byte_cnt = pData[4];
        byte_cnt <<= 8;
        byte_cnt |= pData[5];

        word_cnt = byte_cnt / 2;

        pWord = (unsigned short*)&Comp_Info[Uart_Info[UART4_485].Call_Id - MEM_ADDR_COMP1];

        pWord += lower_addr / 2;

        cnt = 6;

        for(i=0;i<word_cnt;i++)
        {
            word_buf = pData[cnt++];
            word_buf <<= 8;
            word_buf |= pData[cnt++];
            
//            Compute_Injection_Flag(lower_addr,&word_buf);       // 인젝션 변수 -> 통합제어 변수로 변환.
            
            *pWord++ = word_buf;
            
            lower_addr += 2;
        }
		
	if((Total_Info.OPTION_DEVICE & 0x0020) && (Total_Info.TOTAL_RUN_STOP_L_R & 0x0001))
	{
		switch(Uart_Info[UART4_485].Call_Id - MEM_ADDR_COMP1)
		{
			case 0:	MocomType = MICOM_TYPE_COMP1; 	break;
			case 1:	MocomType = MICOM_TYPE_COMP2; 	break;
			case 2:	MocomType = MICOM_TYPE_COMP3;	break;
			case 3:	MocomType = MICOM_TYPE_COMP4; 	break;
			case 4:	MocomType = MICOM_TYPE_COMP5; 	break;
			case 5:	MocomType = MICOM_TYPE_COMP6; 	break;
			case 6:	MocomType = MICOM_TYPE_COMP7;	break;
			case 7:	MocomType = MICOM_TYPE_COMP8; 	break;
		}
		
		if(Total_Info.MAIN_PRESS_CHOICE_PART==0)
		{
			if((Total_Info.RUN_SEQUENCE[0] - 1) != (Uart_Info[UART4_485].Call_Id - MEM_ADDR_COMP1))
			{
				if(Total_Info.SEL_OILFREE_INJECTION & MocomType)
					Comp_Info[Uart_Info[UART4_485].Call_Id - MEM_ADDR_COMP1].SERVICE_PRESSURE = Comp_Info[Uart_Info[UART4_485].Call_Id - MEM_ADDR_COMP1].mEXT_SERVICE_P;	//오일프리 
				else
					Comp_Info[Uart_Info[UART4_485].Call_Id - MEM_ADDR_COMP1].SERVICE_PRESSURE = Comp_Info[Uart_Info[UART4_485].Call_Id - MEM_ADDR_COMP1].mVERSION_2;		//인젝션 
			}
		}
		else
		{
			if(Total_Info.SEL_OILFREE_INJECTION & MocomType)
				Comp_Info[Uart_Info[UART4_485].Call_Id - MEM_ADDR_COMP1].SERVICE_PRESSURE = Comp_Info[Uart_Info[UART4_485].Call_Id - MEM_ADDR_COMP1].mEXT_SERVICE_P;	//오일프리 
			else
				Comp_Info[Uart_Info[UART4_485].Call_Id - MEM_ADDR_COMP1].SERVICE_PRESSURE = Comp_Info[Uart_Info[UART4_485].Call_Id - MEM_ADDR_COMP1].mVERSION_2;		//인젝션 

		}
	}	
    }
    
    else if( Uart_Info[UART4_485].Call_Id >= MEM_ADDR_IO_0xE0 && Uart_Info[UART4_485].Call_Id <= MEM_ADDR_IO_0xEF )      // 0xE0
    {
        byte_cnt = pData[4];
        byte_cnt <<= 8;
        byte_cnt |= pData[5];

        word_cnt = byte_cnt / 2;

        pWord = (unsigned short*)&IO_Info[Uart_Info[UART4_485].Call_Id - MEM_ADDR_IO_0xE0];

        pWord += lower_addr / 2;

        cnt = 6;

        for(i=0;i<word_cnt;i++)
        {
            word_buf = pData[cnt++];
            word_buf <<= 8;
            word_buf |= pData[cnt++];
            
            *pWord++ = word_buf;
            
            lower_addr += 2;
        }
		
    }

    else if( Uart_Info[UART4_485].Call_Id >= MEM_ADDR_20mA_0xF0 && Uart_Info[UART4_485].Call_Id <= MEM_ADDR_20mA_0xFF )      // 0xF0
    {
        byte_cnt = pData[4];
        byte_cnt <<= 8;
        byte_cnt |= pData[5];

        word_cnt = byte_cnt / 2;

        pWord = (unsigned short*)&AI_Info[Uart_Info[UART4_485].Call_Id - MEM_ADDR_20mA_0xF0];

        pWord += lower_addr / 2;

        cnt = 6;

        for(i=0;i<word_cnt;i++)
        {
            word_buf = pData[cnt++];
            word_buf <<= 8;
            word_buf |= pData[cnt++];
            
            *pWord++ = word_buf;
            
            lower_addr += 2;
        }
    }
}

void Uart4_Rcv_0x15_Data(unsigned char *pData)
{
    unsigned short word_buf, *pWord, byte_cnt, i, MocomType;
    unsigned char upper_addr, lower_addr;
    
    byte_cnt = pData[2];
    byte_cnt <<= 8;
    byte_cnt |= pData[3];
	
	pData += 4;
	
    if( Uart_Info[UART4_485].Call_Id >= MEM_ADDR_COMP1 && Uart_Info[UART4_485].Call_Id <= MEM_ADDR_COMP8 )
    {
        while( byte_cnt > 0 )
        {
            upper_addr = *pData++;
            lower_addr = *pData++;
            
            byte_cnt -= 2;			// 주소길이감소

            word_buf = *pData++;
            word_buf <<= 8;
            word_buf |= *pData++;
            
            pWord = (unsigned short*)&Comp_Info[Uart_Info[UART4_485].Call_Id - MEM_ADDR_COMP1];	// 0 ~
            
            pWord += lower_addr / 2;
            
//            Compute_Injection_Flag(lower_addr,&word_buf);       // 인젝션 변수 -> 통합제어 변수로 변환.
            
            *pWord = word_buf;
            
            byte_cnt -= 2;		// 데이터길이감소
        }
		
	if((Total_Info.OPTION_DEVICE & 0x0020) && (Total_Info.TOTAL_RUN_STOP_L_R & 0x0001))
	{
		switch(Uart_Info[UART4_485].Call_Id - MEM_ADDR_COMP1)
		{
			case 0:	MocomType = MICOM_TYPE_COMP1; 	break;
			case 1:	MocomType = MICOM_TYPE_COMP2; 	break;
			case 2:	MocomType = MICOM_TYPE_COMP3;	break;
			case 3:	MocomType = MICOM_TYPE_COMP4; 	break;
			case 4:	MocomType = MICOM_TYPE_COMP5; 	break;
			case 5:	MocomType = MICOM_TYPE_COMP6; 	break;
			case 6:	MocomType = MICOM_TYPE_COMP7;	break;
			case 7:	MocomType = MICOM_TYPE_COMP8; 	break;
		}
		
		if(Total_Info.MAIN_PRESS_CHOICE_PART==0)
		{
			if((Total_Info.RUN_SEQUENCE[0] - 1) != (Uart_Info[UART4_485].Call_Id - MEM_ADDR_COMP1))
			{
				if(Total_Info.SEL_OILFREE_INJECTION & MocomType)
					Comp_Info[Uart_Info[UART4_485].Call_Id - MEM_ADDR_COMP1].SERVICE_PRESSURE = Comp_Info[Uart_Info[UART4_485].Call_Id - MEM_ADDR_COMP1].mEXT_SERVICE_P;	//오일프리 
				else
					Comp_Info[Uart_Info[UART4_485].Call_Id - MEM_ADDR_COMP1].SERVICE_PRESSURE = Comp_Info[Uart_Info[UART4_485].Call_Id - MEM_ADDR_COMP1].mVERSION_2;		//인젝션 
			}
		}
		else
		{
			if(Total_Info.SEL_OILFREE_INJECTION & MocomType)
				Comp_Info[Uart_Info[UART4_485].Call_Id - MEM_ADDR_COMP1].SERVICE_PRESSURE = Comp_Info[Uart_Info[UART4_485].Call_Id - MEM_ADDR_COMP1].mEXT_SERVICE_P;	//오일프리 
			else
				Comp_Info[Uart_Info[UART4_485].Call_Id - MEM_ADDR_COMP1].SERVICE_PRESSURE = Comp_Info[Uart_Info[UART4_485].Call_Id - MEM_ADDR_COMP1].mVERSION_2;		//인젝션 

		}
	}	
    }
    
    else if( Uart_Info[UART4_485].Call_Id >= MEM_ADDR_IO_0xE0 && Uart_Info[UART4_485].Call_Id <= MEM_ADDR_IO_0xEF )      // 0xE0
    {
        while( byte_cnt > 0 )
        {
            upper_addr = *pData++;
            lower_addr = *pData++;
            
            byte_cnt -= 2;			// 주소길이감소

            word_buf = *pData++;
            word_buf <<= 8;
            word_buf |= *pData++;
            
            pWord = (unsigned short*)&IO_Info[Uart_Info[UART4_485].Call_Id - MEM_ADDR_IO_0xE0];
            
            pWord += lower_addr / 2;
            
            *pWord = word_buf;
            
            byte_cnt -= 2;		// 데이터길이감소
        }
    }

    else if( Uart_Info[UART4_485].Call_Id >= MEM_ADDR_20mA_0xF0 && Uart_Info[UART4_485].Call_Id <= MEM_ADDR_20mA_0xFF )      // 0xF0
    {
        while( byte_cnt > 0 )
        {
            upper_addr = *pData++;
            lower_addr = *pData++;
            
            byte_cnt -= 2;			// 주소길이감소

            word_buf = *pData++;
            word_buf <<= 8;
            word_buf |= *pData++;
            
            pWord = (unsigned short*)&AI_Info[Uart_Info[UART4_485].Call_Id - MEM_ADDR_20mA_0xF0];
            
            pWord += lower_addr / 2;
            
            *pWord = word_buf;
            
            byte_cnt -= 2;		// 데이터길이감소
        }
    }
}

void Uart4_Tx_Process(void)
{
    unsigned short cal_crc;
    unsigned char comp_device, io_device, ai_device, i;
	
    if(Uart_Info[UART4_485].Tx_Timeout==0)	Uart_Info[UART4_485].Tx_Timeout=300;
		
    if( Uart_Info[UART4_485].Tx_Timeout > 1 )   return;
    
    if( Uart_Info[UART4_485].Tx_Timeout == 1 )      // 응답없음. 연결비트 클리어.
    {
        Uart_Info[UART4_485].Tx_Timeout = 300;

        if( Uart_Info[UART4_485].Ack_Flag == CLR )
        {
            if( Uart_Info[UART4_485].Call_Id >= MEM_ADDR_COMP1 && Uart_Info[UART4_485].Call_Id <= MEM_ADDR_COMP8 )
            {
                if( Main_Info.Comp_Connect_Cnt[Uart_Info[UART4_485].Call_Id - MEM_ADDR_COMP1] > 0 )     Main_Info.Comp_Connect_Cnt[Uart_Info[UART4_485].Call_Id - MEM_ADDR_COMP1]--;
            }
            else if( Uart_Info[UART4_485].Call_Id >= MEM_ADDR_IO_0xE0 && Uart_Info[UART4_485].Call_Id <= MEM_ADDR_IO_0xEF )
            {
                if( Main_Info.Dio_Connect_Cnt[Uart_Info[UART4_485].Call_Id - MEM_ADDR_IO_0xE0] > 0 )     Main_Info.Dio_Connect_Cnt[Uart_Info[UART4_485].Call_Id - MEM_ADDR_IO_0xE0]--;
            }
            else if( Uart_Info[UART4_485].Call_Id >= MEM_ADDR_20mA_0xF0 && Uart_Info[UART4_485].Call_Id <= MEM_ADDR_20mA_0xFF )
            {
                if( Main_Info.Ma420_Connect_Cnt[Uart_Info[UART4_485].Call_Id - MEM_ADDR_20mA_0xF0] > 0 )     Main_Info.Ma420_Connect_Cnt[Uart_Info[UART4_485].Call_Id - MEM_ADDR_20mA_0xF0]--;
            }
        }
    }
    
	if( Uart_Info[UART4_485].Tx_Enable == SET )
	{
	        if( Uart_Info[UART4_485].Tx_Buf[0] >= (MEM_ADDR_COMP1 + 0x10) && Uart_Info[UART4_485].Tx_Buf[0] <= (MEM_ADDR_COMP8 + 0x10) )
	            Uart_Info[UART4_485].Call_Id = Uart_Info[UART4_485].Tx_Buf[0] + 0x10;         // 0x11 -> 0x01
	        else
	            Uart_Info[UART4_485].Call_Id = Uart_Info[UART4_485].Tx_Buf[0];         		// 0x11 -> 0x01
	
		USART4_TX;	Uart_Info[UART4_485].TxOn_Sig=20;
		HAL_UART_Transmit_IT(&huart4,Uart_Info[UART4_485].Tx_Buf,Uart_Info[UART4_485].Tx_Length+2);

		Uart_Info[UART4_485].Tx_Enable = CLR;	
	}
	else
    	{
		comp_device = Total_Info.USE_COMP_QTY;
		io_device = (Total_Info.USE_DEVICE >> 0) & 0xFF;
		ai_device = (Total_Info.USE_DEVICE >> 8) & 0xFF;
	        
	        switch( Uart_Info[UART4_485].Call_Id )
	        {
			case MEM_ADDR_COMP1 :
			case MEM_ADDR_COMP2 :
			case MEM_ADDR_COMP3 :
			case MEM_ADDR_COMP4 :
			case MEM_ADDR_COMP5 :
			case MEM_ADDR_COMP6 :
			case MEM_ADDR_COMP7 :
			case MEM_ADDR_COMP8 :
	                
				Uart_Info[UART4_485].Call_Id++;
				
				if( comp_device == (Uart_Info[UART4_485].Call_Id - 0x11) )    // 다음으로.
				{
					if((Total_Info.OPTION_DEVICE & 0x0020) && (Total_Info.TOTAL_RUN_STOP_L_R & 0x0001))	//메인압력모듈적용 및 통합운전시 
					{
						Uart_Info[UART4_485].Tx_Buf[0] = 0xFF;            
						Uart_Info[UART4_485].Tx_Buf[1] = 0x20;
						
						if(Total_Info.SEL_OILFREE_INJECTION == 0)
						{
							Uart_Info[UART4_485].Tx_Buf[2] = 0;
							Uart_Info[UART4_485].Tx_Buf[3] = 128;	//addr=128
						}
						else
						{
							Uart_Info[UART4_485].Tx_Buf[2] = (((unsigned char*)&Comp_Info[0].mEXT_SERVICE_P - (unsigned char*)&Comp_Info[0])) >> 8;
							Uart_Info[UART4_485].Tx_Buf[3] = (((unsigned char*)&Comp_Info[0].mEXT_SERVICE_P - (unsigned char*)&Comp_Info[0])) & 0xFF;	//addr=164
						}
						
						Uart_Info[UART4_485].Tx_Buf[4] = 0;
						Uart_Info[UART4_485].Tx_Buf[5] = 2;
						Uart_Info[UART4_485].Tx_Buf[6] = Total_Info.SERVICE_PRESSURE >> 8;
						Uart_Info[UART4_485].Tx_Buf[7] = Total_Info.SERVICE_PRESSURE & 0xFF;

						cal_crc = crc16(&Uart_Info[UART4_485].Tx_Buf[0],8);

						Uart_Info[UART4_485].Tx_Buf[8] = cal_crc >> 8;
						Uart_Info[UART4_485].Tx_Buf[9] = cal_crc & 0xFF;
						
						USART4_TX;	Uart_Info[UART4_485].TxOn_Sig=20;
						HAL_UART_Transmit_IT(&huart4,Uart_Info[UART4_485].Tx_Buf,10);	

		    				Uart_Info[UART4_485].Tx_Timeout = 50;		
							
					}
					else
					{
						if( io_device > 0 )
						    Uart_Info[UART4_485].Call_Id = MEM_ADDR_IO_0xE0;
						else if( ai_device > 0 )
						    Uart_Info[UART4_485].Call_Id = MEM_ADDR_20mA_0xF0;
						else
						    Uart_Info[UART4_485].Call_Id = MEM_ADDR_COMP1;
					}
				}
				else if( comp_device < (Uart_Info[UART4_485].Call_Id - 0x11) )    // 다음으로.
				{
					if( io_device > 0 )
					    Uart_Info[UART4_485].Call_Id = MEM_ADDR_IO_0xE0;
					else if( ai_device > 0 )
					    Uart_Info[UART4_485].Call_Id = MEM_ADDR_20mA_0xF0;
					else
					    Uart_Info[UART4_485].Call_Id = MEM_ADDR_COMP1;
				}
				break;
	                                
			case MEM_ADDR_IO_0xE0 :
			case MEM_ADDR_IO_0xE1 :
			case MEM_ADDR_IO_0xE2 :
			case MEM_ADDR_IO_0xE3 :
			case MEM_ADDR_IO_0xE4 :
			case MEM_ADDR_IO_0xE5 :
			case MEM_ADDR_IO_0xE6 :
			case MEM_ADDR_IO_0xE7 :
			case MEM_ADDR_IO_0xE8 :
			case MEM_ADDR_IO_0xE9 :
			case MEM_ADDR_IO_0xEA :
			case MEM_ADDR_IO_0xEB :
			case MEM_ADDR_IO_0xEC :
			case MEM_ADDR_IO_0xED :
			case MEM_ADDR_IO_0xEE :
			case MEM_ADDR_IO_0xEF :
	                
				Uart_Info[UART4_485].Call_Id++;

				if( io_device <= (Uart_Info[UART4_485].Call_Id - 0xE0) )
				{
				    if( ai_device > 0 )
				        Uart_Info[UART4_485].Call_Id = MEM_ADDR_20mA_0xF0;
				    else
				        Uart_Info[UART4_485].Call_Id = MEM_ADDR_COMP1;
				}

				break;
	                                
			case MEM_ADDR_20mA_0xF0 :
			case MEM_ADDR_20mA_0xF1 :
			case MEM_ADDR_20mA_0xF2 :
			case MEM_ADDR_20mA_0xF3 :
			case MEM_ADDR_20mA_0xF4 :
			case MEM_ADDR_20mA_0xF5 :
			case MEM_ADDR_20mA_0xF6 :
			case MEM_ADDR_20mA_0xF7 :
			case MEM_ADDR_20mA_0xF8 :
			case MEM_ADDR_20mA_0xF9 :
			case MEM_ADDR_20mA_0xFA :
			case MEM_ADDR_20mA_0xFB :
			case MEM_ADDR_20mA_0xFC :
			case MEM_ADDR_20mA_0xFD :
			case MEM_ADDR_20mA_0xFE :
			case MEM_ADDR_20mA_0xFF :
	                
				Uart_Info[UART4_485].Call_Id++;

				if( ai_device <= (Uart_Info[UART4_485].Call_Id - 0xF0) )
				    Uart_Info[UART4_485].Call_Id = MEM_ADDR_COMP1;

				break;
	                                
	            	default :
	                                Uart_Info[UART4_485].Call_Id = MEM_ADDR_COMP1;
	                                
	                                break;
	        }

		if(Uart_Info[UART4_485].Tx_Timeout > 100)
		{
			if( Uart_Info[UART4_485].Call_Id >= MEM_ADDR_COMP1 && Uart_Info[UART4_485].Call_Id <= MEM_ADDR_COMP8 )              // 첫번째 연결이면 0x13 으로 전체요청.
			{
				Uart_Info[UART4_485].Tx_Buf[0] = Uart_Info[UART4_485].Call_Id - 0x10;

				//if( Total_Info.COMP_CONNECT & (1 << (Uart_Info[UART4_485].Call_Id - 0x11)) )      Uart_Info[UART4_485].Tx_Buf[1] = 0x15;
				//else                                                                    Uart_Info[UART4_485].Tx_Buf[1] = 0x13;

				Uart_Info[UART4_485].Tx_Buf[1] = 0x13;
			}
			else if( Uart_Info[UART4_485].Call_Id >= MEM_ADDR_IO_0xE0 && Uart_Info[UART4_485].Call_Id <= MEM_ADDR_IO_0xEF )
			{
				Uart_Info[UART4_485].Tx_Buf[0] = Uart_Info[UART4_485].Call_Id;

				//if( Total_Info.DIO_CONNECT & (1 << (Uart_Info[UART4_485].Call_Id - 0xE0)) )      Uart_Info[UART4_485].Tx_Buf[1] = 0x15;
				//else                                                                Uart_Info[UART4_485].Tx_Buf[1] = 0x13;

				Uart_Info[UART4_485].Tx_Buf[1] = 0x13;
			}
			else if( Uart_Info[UART4_485].Call_Id >= MEM_ADDR_20mA_0xF0 && Uart_Info[UART4_485].Call_Id <= MEM_ADDR_20mA_0xFF )
			{
				Uart_Info[UART4_485].Tx_Buf[0] = Uart_Info[UART4_485].Call_Id;

				//if( Total_Info.MA420_CONNECT & (1 << (Uart_Info[UART4_485].Call_Id - 0xF0)) )      Uart_Info[UART4_485].Tx_Buf[1] = 0x15;
				//else                                                                Uart_Info[UART4_485].Tx_Buf[1] = 0x13;

				Uart_Info[UART4_485].Tx_Buf[1] = 0x13;
			}

			Uart_Info[UART4_485].Ack_Flag = CLR;

			Uart_Info[UART4_485].Tx_Buf[2] = Uart_Info[UART4_485].Call_Id;
			Uart_Info[UART4_485].Tx_Buf[3] = 0;
			Uart_Info[UART4_485].Tx_Buf[4] = 0;
			Uart_Info[UART4_485].Tx_Buf[5] = 0;

			cal_crc = crc16(&Uart_Info[UART4_485].Tx_Buf[0],6);

			Uart_Info[UART4_485].Tx_Buf[6] = cal_crc >> 8;
			Uart_Info[UART4_485].Tx_Buf[7] = cal_crc & 0xFF;
			
			USART4_TX;	Uart_Info[UART4_485].TxOn_Sig=20;
			HAL_UART_Transmit_IT(&huart4,Uart_Info[UART4_485].Tx_Buf,8);
		}
    	}
}

void Check_Board_Conn(void)
{
    if( Uart_Info[UART4_485].Rx_Buf[2] >= MEM_ADDR_COMP1 && Uart_Info[UART4_485].Rx_Buf[2] <= MEM_ADDR_COMP8 )
    {
        Main_Info.Comp_Connect_Cnt[Uart_Info[UART4_485].Rx_Buf[2] - MEM_ADDR_COMP1] = 5;
    }
    else if( Uart_Info[UART4_485].Rx_Buf[2] >= MEM_ADDR_IO_0xE0 && Uart_Info[UART4_485].Rx_Buf[2] <= MEM_ADDR_IO_0xEF )
    {
        Main_Info.Dio_Connect_Cnt[Uart_Info[UART4_485].Rx_Buf[2] - MEM_ADDR_IO_0xE0] = 5;
    }
    else if( Uart_Info[UART4_485].Rx_Buf[2] >= MEM_ADDR_20mA_0xF0 && Uart_Info[UART4_485].Rx_Buf[2] <= MEM_ADDR_20mA_0xFF )
    {
        Main_Info.Ma420_Connect_Cnt[Uart_Info[UART4_485].Rx_Buf[2] - MEM_ADDR_20mA_0xF0] = 5;
    }
}

void Uart4_Rx_Process(void)
{
    unsigned short cal_crc, rcv_crc;
    
    if( Uart_Info[UART4_485].Rcv_Pkt == SET )
    {
        Uart_Info[UART4_485].Rcv_Pkt = CLR;
        
        cal_crc = crc16((unsigned char*)Uart_Info[UART4_485].Rx_Buf, Uart_Info[UART4_485].Rx_Cnt - 2);
        rcv_crc = Uart_Info[UART4_485].Rx_Buf[Uart_Info[UART4_485].Rx_Cnt - 2];
        rcv_crc <<= 8;
        rcv_crc |= Uart_Info[UART4_485].Rx_Buf[Uart_Info[UART4_485].Rx_Cnt - 1];
        
        if( cal_crc == rcv_crc )                            // 패킷수신.
        {
            Uart_Info[UART4_485].Link_Time = 3000;
            
            Check_Board_Conn();
            
            if( Uart_Info[UART4_485].Rx_Buf[1] == 0x13 )           // 0x13 수신. 전체
            {
                Uart4_Rcv_0x13_Data(&Uart_Info[UART4_485].Rx_Buf[0]);
            }
            else if( Uart_Info[UART4_485].Rx_Buf[1] == 0x15 )      // 0x15 수신. 변화
            {
                Uart4_Rcv_0x15_Data(&Uart_Info[UART4_485].Rx_Buf[0]);
            }
            
            Uart_Info[UART4_485].Rx_Timeout = 0;
            Uart_Info[UART4_485].Tx_Timeout = 50;                   // 패킷수신 후 다음번 명령까지의 TX 딜레이는 상대측 보드의 내부 지연시간을 고려해서 50ms 후에 전송함.
            Uart_Info[UART4_485].Ack_Flag = SET;                    // 패킷요청 때 CLR. 정상수신되고 CRC 문제 없으면 SET.
        }
    }
}
