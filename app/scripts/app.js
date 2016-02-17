/* jshint camelcase: false */
/* global Plotly */
(function(window, $, Plotly, undefined) {
    'use strict';
    console.log('PMR Box Plot Demo!');
    var appContext = $('[data-app-name="pmrboxplotapp"]');
    var empty_boxplot_text = '<blockquote>Click the \'Plot\' button above to generate a box plot.</blockquote>';

    /* Use Agave ready event as signal to start drawing */
    window.addEventListener('Agave::ready', function() {
        var Agave = window.Agave;
        console.log('Agave ready!');

        var init = function() {
            console.log('Starting init...');
            Agave.api.adama.list({
                'namespace': 'pmr',
                'service': 'pmr_experiments_api_v0.4'
            }, function(search) {
                var experiments = $.map(search.obj.result[0], function(item) {
                    return {
                        label: item.expName,
                        value: item.expId,
                    };
                });

                // setup dropdown boxes
                $('#metabolite_selection', appContext).cascadingDropdown({
                    selectBoxes: [
                        {
                            selector: '.step1',
                            source: experiments,
                            selected: 0
                        },
                        {
                            selector: '.step2',
                            requires: ['.step1'],
                            selected: 0,
                            source: function(request, response) {
                                Agave.api.adama.list({
                                    'namespace': 'pmr',
                                    'service': 'pmr_platform_api_v0.4',
                                    'queryParams': request
                                }, function(search) {
                                    response($.map(search.obj.result[0], function(item, index) {
                                        if (index === 0) {
                                            return {
                                                label: item.platformName,
                                                value: item.platformId,
                                                selected: true
                                            };
                                        } else {
                                            return {
                                                label: item.platformName,
                                                value: item.platformId,
                                            };
                                        }
                                    }));
                                });
                            }
                        },
                        {
                            selector: '.step3',
                            requires: ['.step1', '.step2'],
                            requireAll: true,
                            selected: 1,
                            source: function(request, response) {
                                Agave.api.adama.list({
                                    'namespace': 'pmr',
                                    'service': 'pmr_boxplot_api_v0.4',
                                    'queryParams': request
                                }, function(search) {
                                    response($.map(search.obj.result[0], function(item) {
                                        return {
                                            label: item.metaboliteName,
                                            value: item.mId,
                                        };
                                    }));
                                });
                            }
                        }
                    ]
                });
            });
        };

        var errorMessage = function errorMessage(message) {
            return '<div class="alert alert-danger fade in" role="alert">' +
                   '<a href="#" class="close" data-dismiss="alert" aria-label="close">&times;</a>' +
                   '<span class="glyphicon glyphicon-exclamation-sign" aria-hidden="true"></span><span class="sr-only">Error:</span> ' +
                   message + '</div>';
        };

        var warningMessage = function warningMessage(message) {
            return '<div class="alert alert-warning fade in" role="alert">' +
                   '<a href="#" class="close" data-dismiss="alert" aria-label="close">&times;</a>' +
                   '<span class="glyphicon glyphicon-warning-sign" aria-hidden="true"></span><span class="sr-only">Warning:</span> ' +
                   message + '</div>';
        };

        // Displays an error message if the API returns an error
        var showErrorMessage = function showErrorMessage(response) {
            // clear progress bar and spinners
            $('#progress_region', appContext).addClass('hidden');
            var message = '';
            var status = '';
            if (response && response.obj) {
                message = response.obj.message;
                status = response.obj.status;
            }
            console.error('API Status: ' + status + ' API Message: ' + message);
            $('#error', appContext).html(errorMessage('Trouble interacting with the server [' + message + ']! Please try again later.'));
        };

        var renderViz = function renderViz (jsondata) {
            $('#progress_region', appContext).addClass('hidden');
            console.log('data fetched, start renderViz');
            // Adama adds metadata like response time and HTTP status code.
            // Here, strip away the metadata added by Adama.
            // Another way to do this is with the 'naked data' option in Adama.
            var result = jsondata.obj.result[0];
            console.log('DATA: ' + JSON.stringify(result));
            if (result.x) {
                $('#boxplot').removeClass('hidden');
                var plotData = result.x;
                Plotly.newPlot('boxplot', plotData.data, plotData.layout, plotData.config);
            } else {
                var search_experiment = $('#experimentID option:selected', appContext).text();
                var search_platform = $('#platformID option:selected', appContext).text();
                var search_metabolite = $('#metaboliteID option:selected', appContext).text();
                var selected_data = 'Experiment: \'' + search_experiment + '\', Platform: \'' + search_platform + '\', and Metabolite: \'' + search_metabolite + '\'';
                $('#error', appContext).html(warningMessage('No plot data found for ' + selected_data + '. Please try again.'));
            }
            console.log('finish renderViz');
        };

        init();

        // controls the clear button
        $('#clearButton', appContext).on('click', function () {
            // clear the error section
            $('#error', appContext).empty();
            // clear the number of result rows from the tabs
            $('#progress_region', appContext).addClass('hidden');
            // clear the graph
            $('#boxplot', appContext).html(empty_boxplot_text);
            $('a[href="#about"]', appContext).tab('show');
        });

        $('#metabolite_plot', appContext).submit(function (event) {
            event.preventDefault();

            // Reset error div
            $('#error', appContext).empty();

            $('a[href="#plot"]', appContext).tab('show');

            $('#boxplot', appContext).html(empty_boxplot_text);

            var query = {
                'experimentID': this.experimentID.value,
                'platformID': this.platformID.value,
                'metaboliteID': this.metaboliteID.value
            };

            // start progress bar
            $('#progress_region', appContext).removeClass('hidden');
            console.log('launch asynchronous data fetch');
            Agave.api.adama.search({
                'namespace': 'pmr',
                'service': 'pmr_boxplot_api_v0.4',
                'queryParams': query
            }, renderViz, showErrorMessage);
            console.log('data fetch invoked, waiting for response');
        });
    });
})(window, jQuery, Plotly);
