// gccphat.cpp
// Implements the GCC-PHAT algorithm for determining the delay between two signals. Has better
//     performance than a normal cross correlation in reverberant environments.
// Ryker Dial
// UAF ITEST
// Created: June 23, 2016
// Last Modified: June 29, 2016

// Cross correlation implementation originally from https://github.com/dMaggot/libxcorr.

#include "../include/gccphat.h"
#include <string.h>

// class gccphat_manager {
// public:
//     fftw_complex * signala_ext
//     fftw_complex * signalb_ext
//     fftw_complex * out_shifted
//     fftw_complex * outa
//     fftw_complex * outb
// };

void makeGccphatPlans(fftw_plan & fft, fftw_plan & ifft, int N) {
    fftw_complex * signal_ext = (fftw_complex *) fftw_malloc(sizeof(fftw_complex) * (2 * N - 1));
    fftw_complex * out = (fftw_complex *) fftw_malloc(sizeof(fftw_complex) * (2 * N - 1));

    fft = fftw_plan_dft_1d(2 * N - 1, signal_ext, out, FFTW_FORWARD, FFTW_MEASURE);
    ifft = fftw_plan_dft_1d(2 * N - 1, out, signal_ext, FFTW_BACKWARD, FFTW_MEASURE);

    fftw_free(signal_ext);
    fftw_free(out);
}

void printGccphatResult(std::pair<double, int> max_corr_pair, int signum1, int signum2, double fs) {
    std::printf("Max correlation of signals %d and %d is %f at a lag of %d.\n", signum1, signum2, max_corr_pair.first, max_corr_pair.second);
    if(max_corr_pair.second > 0) 
        std::printf("Signal %d leads signal %d by %f seconds.\n", signum1, signum2, max_corr_pair.second/fs);
    else if(max_corr_pair.second < 0)
        std::printf("Signal %d lags signal %d by %f seconds.\n", signum1, signum2, max_corr_pair.second/fs);
    else
        std::printf("Signals %d and %d are fully synchronized.\n", signum1, signum2);
}

std::pair<double, int> gccphat(fftw_complex * signala, fftw_complex * signalb, fftw_complex * result, int N, fftw_plan & fft, fftw_plan & ifft) {
    fftw_complex * signala_ext = (fftw_complex *) fftw_malloc(sizeof(fftw_complex) * (2 * N - 1));
    fftw_complex * signalb_ext = (fftw_complex *) fftw_malloc(sizeof(fftw_complex) * (2 * N - 1));
    fftw_complex * out_shifted = (fftw_complex *) fftw_malloc(sizeof(fftw_complex) * (2 * N - 1));
    fftw_complex * outa = (fftw_complex *) fftw_malloc(sizeof(fftw_complex) * (2 * N - 1));
    fftw_complex * outb = (fftw_complex *) fftw_malloc(sizeof(fftw_complex) * (2 * N - 1));
    fftw_complex * out = (fftw_complex *) fftw_malloc(sizeof(fftw_complex) * (2 * N - 1));

    //zeropadding
    memset (signala_ext, 0, sizeof(fftw_complex) * (N - 1));
    memcpy (signala_ext + (N - 1), signala, sizeof(fftw_complex) * N);
    memcpy (signalb_ext, signalb, sizeof(fftw_complex) * N);
    memset (signalb_ext + N, 0, sizeof(fftw_complex) * (N - 1));

    fftw_execute_dft(fft, signala_ext, outa);
    fftw_execute_dft(fft, signalb_ext, outb);


   // double scale = 1.0/(2 * N -1);
    std::complex<double> * out_cmplx = reinterpret_cast<std::complex<double> *>(out);
    std::complex<double> * outa_cmplx = reinterpret_cast<std::complex<double> *>(outa);
    std::complex<double> * outb_cmplx = reinterpret_cast<std::complex<double> *>(outb);

    for (int i = 0; i < 2 * N - 1; i++)
        out_cmplx[i] = outa_cmplx[i] * conj(outb_cmplx[i])/(abs(outa_cmplx[i] * conj(outb_cmplx[i])));
    // *****

    fftw_execute_dft(ifft, out, result);

    std::pair<double, int> max_corr_pair = std::make_pair(result[0][0],-N+1);
    for(int i=0; i<2*N-1; ++i) {
        if(result[i][0] > max_corr_pair.first) {
            max_corr_pair.first = result[i][0];
            max_corr_pair.second = i-N+1; 
        }
    }

    fftw_free(signala_ext);
    fftw_free(signalb_ext);
    fftw_free(out_shifted);
    fftw_free(out);
    fftw_free(outa);
    fftw_free(outb);

    return max_corr_pair;
}
