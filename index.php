<?php

require_once 'vendor/autoload.php';
require_once 'vendor/php-activerecord/php-activerecord/ActiveRecord.php';

\Slim\Slim::registerAutoloader();

// ------------- Initialization -------------

ActiveRecord\Config::initialize(function($cfg) {
    $cfg->set_model_directory('models');
    $cfg->set_connections(array(
        'development' => 'sqlite://telbase.db'
    ));
});

$app = new \Slim\Slim(array(
    'template.path' => './templates',
    'view' =>  new \Slim\Extras\Views\Twig()
));

// ------------- RequestHandler -------------

class BadRequestException extends ErrorException {};

class AjaxHandler {
    private static $cmd_routes = array(
        'getAllData'     => 'get_all_data',
        'deleteContacts' => 'delete_contacts',
        'createContact'  => 'create_contact',
        'updateContact'  => 'update_contact'
    );

    public function handle_request($request) {
        $response = array('status' => 'ok');
        try {
            if (!isset($request['cmd'])) {
                throw new BadRequestException('Field cmd is blank');
            }
            $cmd = $request['cmd'];
            $handler = self::$cmd_routes[$cmd];
            $response = array_merge($response, call_user_func(array($this, $handler), $request));
        }
        catch (BadRequestException $ex) {
            $response['status'] = 'error';
            $response['message'] = $ex->getMessage();
        }
        return json_encode($response);
    }

    private function get_all_data() {
        // TODO: Order records
        $model_to_arr = function($model_name) {
            $model_objects = $model_name::all();
            return array_map(function($m_obj) {
                return $m_obj->to_array();
            }, $model_objects);
        };
        return array(
            'contacts' => $model_to_arr('Contact'),
            'cities'   => $model_to_arr('City'),
            'streets'  => $model_to_arr('Street')
        );
    }

    private function create_contact($contact) {
        return array();
    }

    private function update_contact($contact) {
        return array();
    }

    private function delete_contacts($contact_ids) {
        return array();
    }
}

// ------------------------------------------

$app->get('/', function() use ($app) {
    $app->render('home.twig.html', array(
        'cities' => City::all()
    ));
});

$app->get('/about', function() {
    echo 'about';
});

$app->post('/ajax', function() use ($app) {
    $req = $app->request()->post('request');
    $ajax_handler = new AjaxHandler();
    echo $ajax_handler->handle_request($req);
});

$app->run();

?>
