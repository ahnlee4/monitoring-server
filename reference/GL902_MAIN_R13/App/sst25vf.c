#include "stm32f4xx_hal.h"
#include "sst25vf.h"

#define     SST25VF_CS_H       HAL_GPIO_WritePin(GPIOA, GPIO_PIN_15, GPIO_PIN_SET)
#define     SST25VF_CS_L       HAL_GPIO_WritePin(GPIOA, GPIO_PIN_15, GPIO_PIN_RESET)

extern SPI_HandleTypeDef hspi3;

unsigned char sst25_id[3];

void sst25vf_id_read(void)
{
    unsigned char buf;
    
    SST25VF_CS_L;
    
    buf = 0x9F;
    
    HAL_SPI_Transmit(&hspi3,&buf,1,1000);
    HAL_SPI_Receive(&hspi3,sst25_id,3,1000);

    SST25VF_CS_H;
}

unsigned char sst25vf_status_read(void)
{
    unsigned char value;

    SST25VF_CS_L;
    
    value = 0x05;
    
    HAL_SPI_Transmit(&hspi3,&value,1,1000);
    HAL_SPI_Receive(&hspi3,&value,1,1000);
    
    SST25VF_CS_H;
    
    return value;
}

void sst25vf_status_write(unsigned char value)
{
    unsigned char buf[2];
    
    SST25VF_CS_L;

    buf[0] = 0x50;
    HAL_SPI_Transmit(&hspi3,buf,1,1000);
    
    SST25VF_CS_H;

    SST25VF_CS_L;
    
    buf[0] = 0x01;
    buf[1] = value;
    HAL_SPI_Transmit(&hspi3,buf,2,1000);
    
    SST25VF_CS_H;
}

void sst25vf_erase_4k(unsigned long addr)
{
    unsigned char buf[4];
    
    SST25VF_CS_L;
    
    buf[0] = 0x06;
    HAL_SPI_Transmit(&hspi3,buf,1,1000);
    
    SST25VF_CS_H;
    
    SST25VF_CS_L;
    
    buf[0] = 0x20;
    buf[1] = addr >> 16;
    buf[2] = addr >> 8;
    buf[3] = addr & 0xFF;
    
    HAL_SPI_Transmit(&hspi3,buf,4,1000);

    SST25VF_CS_H;
    
    while( sst25vf_status_read() & 0x01 );
}

void sst25vf_erase_32k(unsigned long addr)
{
    unsigned char buf[4];
    
    SST25VF_CS_L;
    
    buf[0] = 0x06;
    HAL_SPI_Transmit(&hspi3,buf,1,1000);
    
    SST25VF_CS_H;
    
    SST25VF_CS_L;
    
    buf[0] = 0x52;
    buf[1] = addr >> 16;
    buf[2] = addr >> 8;
    buf[3] = addr & 0xFF;
    
    HAL_SPI_Transmit(&hspi3,buf,4,1000);
    
    SST25VF_CS_H;
    
    while( sst25vf_status_read() & 0x01 );
}

void sst25vf_erase_64k(unsigned long addr)
{
    unsigned char buf[4];
    
    SST25VF_CS_L;
    
    buf[0] = 0x06;
    HAL_SPI_Transmit(&hspi3,buf,1,1000);
    
    SST25VF_CS_H;
    
    SST25VF_CS_L;
    
    buf[0] = 0xD8;
    buf[1] = addr >> 16;
    buf[2] = addr >> 8;
    buf[3] = addr & 0xFF;
    
    HAL_SPI_Transmit(&hspi3,buf,4,1000);
    
    SST25VF_CS_H;
    
    while( sst25vf_status_read() & 0x01 );
}

void sst25vf_write_enable(void)
{
    unsigned char buf;
    
    SST25VF_CS_L;
    
    buf = 0x06;
    HAL_SPI_Transmit(&hspi3,&buf,1,1000);
    
    SST25VF_CS_H;
}

void sst25vf_write_byte(unsigned long addr, unsigned char value)
{
    unsigned char buf[5];
    
    sst25vf_write_enable();
    
    SST25VF_CS_L;
    
    buf[0] = 0x02;
    buf[1] = addr >> 16;
    buf[2] = addr >> 8;
    buf[3] = addr & 0xFF;
    buf[4] = value;
    
    HAL_SPI_Transmit(&hspi3,buf,5,1000);
    
    SST25VF_CS_H;
    
    while( sst25vf_status_read() & 0x01 );
}

void sst25vf_write_str(unsigned long addr, unsigned char *pData, unsigned long length)
{
    unsigned char buf[16];
    
    sst25vf_write_enable();
    
    SST25VF_CS_L;
    
    buf[0] = 0x02;
    buf[1] = addr >> 16;
    buf[2] = addr >> 8;
    buf[3] = addr & 0xFF;
    
    HAL_SPI_Transmit(&hspi3,buf,4,1000);
    
    HAL_SPI_Transmit(&hspi3,pData,length,1000);
    
    SST25VF_CS_H;
    
    while( sst25vf_status_read() & 0x01 );
}

void sst25vf_read_byte(unsigned long addr, unsigned char *pBuf, unsigned long length)
{
    unsigned char buf[5];
    
    SST25VF_CS_L;
    
    buf[0] = 0x03;
    buf[1] = addr >> 16;
    buf[2] = addr >> 8;
    buf[3] = addr & 0xFF;
    
    HAL_SPI_Transmit(&hspi3,buf,4,1000);
    
    HAL_SPI_Receive(&hspi3,pBuf,length,1000);
    
    SST25VF_CS_H;
}

void sst25vf_read_str(unsigned long addr, unsigned char *pBuf, unsigned long length)
{
    unsigned char buf[5];
    
    SST25VF_CS_L;
    
    buf[0] = 0x03;
    buf[1] = addr >> 16;
    buf[2] = addr >> 8;
    buf[3] = addr & 0xFF;
    
    HAL_SPI_Transmit(&hspi3,buf,4,1000);
    
    HAL_SPI_Receive(&hspi3,pBuf,length,1000);
    
    SST25VF_CS_H;
}
