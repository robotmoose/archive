// Sound_Interface.cpp
// Processes data sent from microphone array via Arduino
// Ryker Dial
// UAF ITEST

// Date Created: 5/31/2016
// Last Modified: 6/23/2016

#include <string>
#include <cstdint>
#include <iostream> // for std::cout, std::endl
#include <vector>
#include <deque>
#include <array>
#include <cstdio> // for std::printf & std::sprintf
#include <utility> // for std::pair
#include "xcorr.h"
#include <fftw3.h>
#include "serial/serial.h"
#include <fstream>
#include <chrono> // For timing

#define NUMSAMPLES_FFT 2271 // Number of samples to use for FFT. FFT resolution is fs/N.
#define FS 11025.0 // Sampling frequency is twice max frequency

// Function Prototypes
bool serial_init(serial::Serial & sp);
void make_xcor_plans(fftw_plan & pa, fftw_plan & pb, fftw_plan & px);

int main() {
	// Setup and open the serial port.
	//serial::Serial sp;
	//serial_init(sp);

	fftw_complex * signala = (fftw_complex *) fftw_malloc(sizeof(fftw_complex) * NUMSAMPLES_FFT);
	fftw_complex * signalb = (fftw_complex *) fftw_malloc(sizeof(fftw_complex) * NUMSAMPLES_FFT);
	fftw_complex * result = (fftw_complex *) fftw_malloc(sizeof(fftw_complex) * 2*NUMSAMPLES_FFT-1);

	std::ifstream s1File ("s1.txt");
	std::ifstream s2File ("s2.txt");

	std::ofstream output ("output.csv", std::ios::out | std::ios::trunc);

	for(int i=0; i<NUMSAMPLES_FFT; ++i) {
		std::string value;
		std::getline(s1File, value);
		signala[i][0] = std::stod(value);
		std::getline(s2File, value);
		signalb[i][0] = std::stod(value);
	}

	// Since ffts and iffts will always be of the same length and type, create the plans only once to boost efficiency.
    fftw_plan pa, pb, px;
    make_xcor_plans(pa,pb,px); // pa and pb are fft of signal a and signal b, and px is ifft of xcor of a & b

	// Benchmark cross correlation
	std::uint64_t avg = 0;
	std::uint32_t numiters = 1000;
	for(int i=0; i<numiters; ++i) {
		auto begin = std::chrono::high_resolution_clock::now();
		xcorr(signala, signalb, result, NUMSAMPLES_FFT, pa, pb, px);
		auto end = std::chrono::high_resolution_clock::now();
		avg += std::chrono::duration_cast<std::chrono::nanoseconds>(end-begin).count();
	}
	std::cout << avg/numiters << " ns (Average of " << numiters << " iterations)" << std::endl;

	// Find the maximum correlation and the associated lag
	std::pair<double, int> max_corr_pair = std::make_pair(result[0][0],-NUMSAMPLES_FFT+1); // store max corr at first, corresponding lag at second
	for(int i=0; i<2*NUMSAMPLES_FFT-1; ++i) {
		if(result[i][0] > max_corr_pair.first) {
			max_corr_pair.first = result[i][0];
			max_corr_pair.second = i-NUMSAMPLES_FFT+1; 
		}
		output << result[i][0] << "," << i-NUMSAMPLES_FFT+1 << std::endl;
	}
	std::cout << "Max correlation is " << max_corr_pair.first << " at a lag of " << max_corr_pair.second << std::endl;
	if(max_corr_pair.second>0) std::cout << "Thus, signal a leads signal b by " << max_corr_pair.second/FS << " seconds\n";
	else if(max_corr_pair.second<0) std::cout << "Thus, signal a lags signal b by " << max_corr_pair.second/FS << " seconds\n";
	else std::cout << "Thus, signals a and b are fully synchronized\n";
	// Clean up
	fftw_destroy_plan(pa);
	fftw_destroy_plan(pb);
	fftw_destroy_plan(px);
	fftw_cleanup();

	// ********** Data Parsing and Processing Setup Begin ********** // 
	// // Variables and containers needed for parsing the serial data
	// std::size_t num_streams = 5; // Number of data streams = number of microphones

	// std::size_t data_length = num_streams*(2)+4; // 2 bytes per microphone + 4 bytes for time
	// std::uint8_t buffer[100];
	// std::uint32_t time_micros;
	// std::vector<std::uint16_t> microphone_data(num_streams);

	// std::uint16_t fs = 40000; // ADC Sampling Frequency
	// // Number of samples to use for FFT. FFT resolution is fs/N.
	// //std::size_t NUMSAMPLES_FFT = 8192;
	// // Counts up to NUMSAMPLES_FFT, then triggers FFT. Is reset to N/2 so FFTs overlap.
	// std::size_t fft_counter = 0;

	//std::vector<std::array<double, NUMSAMPLES_FFT>> crossCorr_pairs(num_streams+1); // Stores cross correlation results
	// 
	// for(int i=0; i=num_streams+1; ++i) {
	// 	for(int j=0; j<NUMSAMPLES_FFT; ++j) {
	// 		crossCorr_pairs[i].push_back(double);
	// 	}
	// }


	// Create a vector of data streams. Each data stream is a deque containing the received
	//     microphone readings.
	// std::vector<std::deque<std::uint16_t>> data_streams;
	// for(int i=0; i<num_streams; ++i) {
	// 	data_streams.push_back(std::deque<std::uint16_t>());
	// }

	// Open up files for data logging
	// std::ofstream output_time("output_time.csv", std::ios::out | std::ios::trunc);
	// std::ofstream output_freq("output_freq.csv", std::ios::out | std::ios::trunc);
	// if(!(output_time.is_open()) || !(output_freq.is_open())) {
	// 	std::cout << "Error: Unable to open log files!" << std::endl;
	// 	return -1;
	// }
	// char buff[50];


	// ********** Data Parsing and Processing Setup End ********** // 

	// std::size_t counter = 0;
	// // ********** Main Program Loop ********** //
	// while(true) {
	// 	// Syncronize by reading CR (10) followed by LF (13)
	// 	sp.read(buffer,1);
	// 	if(buffer[0] == 10) {
	// 		sp.read(buffer,1);
	// 		if(buffer[0] == 13) { // Synchronized
	// 			sp.read(buffer, data_length);
	// 			++fft_counter;

	// 			// Reconstruct time data
	// 			time_micros = 0;
	// 			for(int i=0; i<4; ++i) {
	// 				time_micros += buffer[i] << 8*(3-i);
	// 			}
	// 			//std::printf("Time data: %u\n", time_micros);
	// 			for(int i=0; i<num_streams; ++i) {
	// 				microphone_data[i] = 0;
	// 				// Reconstruct microphone data
	// 				for(int j=0; j<2; ++j) {
	// 					microphone_data[i] += buffer[4+j+i*2] << 8*(1-j);
	// 				}
	// 				// Store data for use with FFT
	// 				data_streams[i].push_back(microphone_data[i]);
	// 				if(data_streams[i].size() > NUMSAMPLES_FFT) data_streams[i].pop_front();
					
	// 				std::sprintf(buff, "%u,", microphone_data[i]);
	// 				output_time << buff;
	// 				//std::printf("Microphone data %d: %u\n", i, microphone_data[i]);
	// 			}
	// 			//std::printf("Counter: %lu\n", fft_counter);
	// 			if(fft_counter >= NUMSAMPLES_FFT) {
	// 				// Execute the Fourier transforms
	// 				for(int i=0; i<num_streams; ++i) {
	// 					for(int j=0; j<NUMSAMPLES_FFT; ++j) {
	// 						// Copy microphone data over. This will convert int to double.
	// 						fft_data[i].first[j] = (double) data_streams[i][j];
	// // 					}
	// 					fftw_execute_r2r(fft, fft_data[i].first, fft_data[i].second);
	// 				}
	// 				// Log the FFT outputs.
	// 				for(int i=0; i<(NUMSAMPLES_FFT+1)/2; ++i) {
	// 					for(int j=0; j<num_streams; ++j) {
	// 						std::sprintf(buff, "%f,", fft_data[j].second[i]);
	// 						output_freq << buff;			
	// 					}
	// 					output_freq << "\n";
	// 				}

	// 				// // For each adjacent FFT pair, calculate the cross correlation.
	// 				// for(int i=0; i<num_streams+1; ++i) {
	// 				// 	if(i!=num_streams) {
	// 				// 		for(int j=0; j<NUMSAMPLES_FFT; ++j) {
	// 				// 			crossCorr_pairs[i][j] = std::abs(fft_data[i].second[j]*fft_data[i+1].second[j]);
	// 				// 		}
	// 				// 	}
	// 				// 	else { // Wraparound
	// 				// 		for(int j=0; j<NUMSAMPLES_FFT; ++j) {
	// 				// 			crossCorr_pairs[i][j] = std::abs(fft_data[i].second[j]*fft_data[0].second[j]);
	// 				// 		}
	// 				// 	}
	// 				// }

	// 				++counter;
	// 				std::printf("FFT Counter %lu\n", counter);
	// 				fft_counter = NUMSAMPLES_FFT/2;
	// 			}
	// 			output_time << "\n";		
	// 		}
	// 	}
	// }
	// Clean Up
	//sp.close();
	//fftw_destroy_plan(fft);
	// fftw_destroy_plan(ifft);
	// for(int i=0; i<num_streams; ++i) {
	// 	fftw_free(fft_data[i].first);
	// 	fftw_free(fft_data[i].second);
	// }
	return 0;
}

bool serial_init(serial::Serial & sp) {
	// Serial Port Parameters
	std::string port = "";
	std::uint32_t baudrate = 921600;
	serial::Timeout timeout = serial::Timeout::simpleTimeout(250);
	serial::bytesize_t bytesize = serial::eightbits;
	serial::parity_t parity = serial::parity_odd;
	serial::stopbits_t stopbits = serial::stopbits_two;
	serial::flowcontrol_t flowcontrol = serial::flowcontrol_none;

	//Get Arduino port name automatically
	std::vector<serial::PortInfo> portInfo = serial::list_ports();
	for(auto it = portInfo.begin(); it != portInfo.end(); ++it) {
		std::cout << it -> description << std::endl;
		std::cout << it -> port << std::endl;
		if((it -> description).find("Arduino") 
			|| (it -> description).find("arduino")
			|| (it -> description).find("USB2.0-Serial")) { // Generic Nano
			port = it -> port;
			break;
		}
	}

	// Set Serial Port Parameters
	sp.setPort(port);
	sp.setBaudrate(baudrate);
	sp.setTimeout(timeout);
	sp.setBytesize(bytesize);
	sp.setParity(parity);
	sp.setStopbits(stopbits);
	sp.setFlowcontrol(flowcontrol);

	sp.open();

	// Check if the port was opened successfully
	if(!sp.isOpen()) {
		std::cout << "Error: serial port " + port + " did not open properly!" << std::endl;
		return false;
	}
	else {
		std::cout << "Serial port " + port + " is open." << std::endl;
		return true;
	}
}

void make_xcor_plans(fftw_plan & pa, fftw_plan & pb, fftw_plan & px) {
    fftw_complex * signala_ext = (fftw_complex *) fftw_malloc(sizeof(fftw_complex) * (2 * NUMSAMPLES_FFT - 1));
    fftw_complex * signalb_ext = (fftw_complex *) fftw_malloc(sizeof(fftw_complex) * (2 * NUMSAMPLES_FFT - 1));
    fftw_complex * out_shifted = (fftw_complex *) fftw_malloc(sizeof(fftw_complex) * (2 * NUMSAMPLES_FFT - 1));
    fftw_complex * outa = (fftw_complex *) fftw_malloc(sizeof(fftw_complex) * (2 * NUMSAMPLES_FFT - 1));
    fftw_complex * outb = (fftw_complex *) fftw_malloc(sizeof(fftw_complex) * (2 * NUMSAMPLES_FFT - 1));
    fftw_complex * out = (fftw_complex *) fftw_malloc(sizeof(fftw_complex) * (2 * NUMSAMPLES_FFT - 1));
    fftw_complex * result = (fftw_complex *) fftw_malloc(sizeof(fftw_complex) * 2*NUMSAMPLES_FFT-1);

    pa = fftw_plan_dft_1d(2 * NUMSAMPLES_FFT - 1, signala_ext, outa, FFTW_FORWARD, FFTW_MEASURE);
    pb = fftw_plan_dft_1d(2 * NUMSAMPLES_FFT - 1, signalb_ext, outb, FFTW_FORWARD, FFTW_MEASURE);
    px = fftw_plan_dft_1d(2 * NUMSAMPLES_FFT - 1, out, result, FFTW_BACKWARD, FFTW_MEASURE);

    fftw_free(signala_ext);
    fftw_free(signalb_ext);
    fftw_free(out_shifted);
    fftw_free(out);
    fftw_free(outa);
    fftw_free(outb);
}

// void parse_serial() {
	
// }
