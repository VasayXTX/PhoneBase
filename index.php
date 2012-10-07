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
        'getResources'   => 'get_resources',
        'getContacts'    => 'get_contacts',
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

    private function select_arr($model_name, $order_sequence) {
        $model_objects = $model_name::find('all', array('order' => $order_sequence));
        return array_map(function($m_obj) {
            return $m_obj->to_array();
        }, $model_objects);
    }

    // ----- Actions -----

    private function get_resources() {
        $order = 'name asc';
        return array(
            'cities'  => $this->select_arr('City', $order),
            'streets' => $this->select_arr('Street', $order),
        );
    }

    private function get_contacts() {
        $order_sequence = 'last_name asc, first_name asc, second_name asc';
        return array('contacts' => $this->select_arr('Contact', $order_sequence));
    }

    private function create_contact($request) {
        Contact::create($request['contact']);
        return array();
    }

    private function update_contact($request) {
        $contact = Contact::find($request['contact']['id']);
        if (isset($request['contact']['street_id']) || empty($request['contact']['street_id'])) {
            $request['contact']['street_id'] = null;
        }
        $contact->update_attributes($request['contact']);
        return array();
    }

    private function delete_contacts($request) {
        foreach ($request['contacts'] as $contact_id) {
            $contact = Contact::find($contact_id);
            $contact->delete();
        }
        return array();
    }
}

// ------------------------------------------

$app->get('/', function() use ($app) {
    $app->render('home.twig.html', array(
        'cities' => City::all()
    ));
});

$app->post('/', function() use ($app) {
    $req = $app->request()->post('request');
    $ajax_handler = new AjaxHandler();
    echo $ajax_handler->handle_request($req);
});

$app->run();

?>
