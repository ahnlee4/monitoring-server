#include "stm32f4xx_hal.h"
#include "memory_map.h"
#include "fram.h"

extern SPI_HandleTypeDef hspi3;
unsigned char fram_id[4];

void Read_Id_Fram(void)
{
    unsigned char buf[8];
    
    FRAM_L;
    
    buf[0] = FRAM_RDID;
    HAL_SPI_Transmit(&hspi3,buf,1,1000);
    HAL_SPI_Receive(&hspi3,fram_id,4,1000);
    
    FRAM_H;
}

void Fram_Write_Status(unsigned char value)
{
    unsigned char buf[8];

    FRAM_L;
    
    buf[0] = FRAM_WREN;
    HAL_SPI_Transmit(&hspi3,buf,1,1000);
    
    FRAM_H;
    
    FRAM_L;

    buf[0] = FRAM_WRSR;
    buf[1] = value;
    HAL_SPI_Transmit(&hspi3,buf,2,1000);
    
    FRAM_H;
}

void Read_Fram(unsigned short addr, unsigned char *pData, unsigned short length)
{
    unsigned char buf[8];
    
    FRAM_L;
    
    buf[0] = FRAM_READ;
    buf[1] = addr >> 8;
    buf[2] = addr & 0xFF;
    
    HAL_SPI_Transmit(&hspi3,buf,3,1000);
    //HAL_SPI_Receive(&hspi3,buf,3,1000);     // dummy
    HAL_SPI_Receive(&hspi3,pData,length,1000);
    
    FRAM_H;
}

void Write_Fram(unsigned short addr, unsigned char *pData, unsigned short length)
{
    unsigned char buf[8];
    
    FRAM_L;
    
    buf[0] = FRAM_WREN;
    HAL_SPI_Transmit(&hspi3,buf,1,1000);
    
    FRAM_H;
    
    FRAM_L;
    
    buf[0] = FRAM_WRITE;
    buf[1] = addr >> 8;
    buf[2] = addr & 0xFF;
    HAL_SPI_Transmit(&hspi3,buf,3,1000);
    HAL_SPI_Transmit(&hspi3,pData,length,1000);
    
    FRAM_H;
}
